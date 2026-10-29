# Version 2 图像生成与原图落地说明

本文记录 DeskPet Version 2 的动物角色和装扮怎样生成、拆分、校准与登记，也记录用户原图
头部与生成身体的合成流程。生成具有随机性；复用提示词不保证得到完全相同的像素，正式
入库前必须重新做透明度、穿戴位置和小尺寸可读性检查。

## 1. 生成方式

- 工具：OpenAI 内置 ImageGen，使用透明背景输出。
- 目标：桌面宠物生产素材，不是概念海报；最终文件为 256×256 RGBA PNG。
- 画风锚点：日系二次元 Q 版动物、2D 赛璐璐、柔和的平涂阴影、深棕色清晰线稿、粉彩配色；
  禁止 3D、emoji 质感、文字、水印、方形底色和现成 IP 特征。
- 构图锚点：角色居中、全身、坐姿、略朝左、64px 下仍可读；装扮使用正面或轻微 3/4
  视角，并为透明边缘和锚点留出余量。

角色使用“一只动物一次生成”的方式，避免批量图中风格和比例互相污染。通用提示词为：

```text
Use case: stylized production asset for a Windows desktop pet.
Create one [ANIMAL] as a clean Japanese anime 2D cel-shaded chibi character,
soft flat shading, crisp dark-brown line art, pastel colors, no 3D or emoji look.
Centered full-body seated pose, slightly facing left, transparent background,
no accessories, no text, no watermark, readable at 64px, with clear attachment
areas around the head, neck, face, paws and back.
```

`[ANIMAL]` 分别替换为 orange tabby kitten、brown-and-white puppy、white rabbit、navy-and-white
penguin、orange tiger cub、mint-green turtle、cream-and-brown hedgehog、brown chipmunk。八张图
分别生成后再统一缩放，不从一张图复制改色。

### 原图头部与生成身体合成

`math_master` 不进行动漫化，最终头部不使用 ImageGen 输出。处理步骤如下：

1. 将用户提供的 163×207 原文件逐字节复制到
   `art_sources/characters/math_master_original.png`，复制时校验 SHA-256 一致；
2. 使用内置 ImageGen 生成透明背景、深蓝衬衫、深色长裤和自然盘坐姿势的写实身体，原图仅
   作为身份和服装参考；结果保存为
   `art_sources/characters/math_master_body_generated.png`；
3. 不采用生成稿中的脸。`scripts/build-math-master-asset.ps1` 按背景颜色和人物连通区域从原图
   抠出头部，去除蓝色椭圆、白底和浅蓝底；
4. 脚本把生成稿头部区域清空，再覆盖原图头部像素，确保五官、表情、发型和头型不经过
   生成式重绘；
5. 将合成结果高质量等比缩放到 256×256 RGBA 透明画布，输出
   `public/assets/characters/math_master.png`；
6. 按全身轮廓重新校准头部、颈部、面部、手持和背部锚点，用户仍可按饰品手动微调。

生成身体所用提示词的核心约束为：

```text
Use case: identity-preserve
Asset type: transparent 2D character asset for a Windows desktop pet
Primary request: remove the oval border and background, then add a naturally proportioned
seated full body wearing a plain dark navy collared shirt, dark trousers and dark shoes.
Style/medium: clean realistic photo composite, not anime, not cartoon, not 3D.
Composition/framing: centered full body, compact seated pose, transparent margin.
Constraints: preserve the supplied identity; no frame, backdrop, props, text or watermark.
```

## 2. 装扮网格提示词

装扮按槽位生成五张透明网格图，以便线条、光照和配色保持一致。通用部分为：

```text
Create a coherent transparent accessory sprite sheet matching the DeskPet anime kitten.
Japanese anime 2D cel style, crisp dark-brown outlines, flat pastel shading.
Use an exact equal grid; center one complete accessory in each cell with transparent margins.
Front or slight 3/4 view. No pet, text, cell borders, opaque background, watermark or cropped item.
```

在通用部分后追加以下网格和顺序：

| 槽位 | 网格 | 从左到右、从上到下                                                                                                  |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------- |
| 头部 | 4×2  | `cap_blue`、`flower_crown`、`hat_woman`、`headphone_music`、`hat_top`、`cap_graduate`、`crown_gold`、`beret_artist` |
| 颈部 | 3×2  | `scarf_red`、`bell_collar`、`ribbon_pink`、`tie_necktie`、`ribbon_reminder`、`collar_starlight`                     |
| 面部 | 2×2  | `glasses_round`、`sunglasses_cool`、`goggles_sky`、`monocle_moon`                                                   |
| 手持 | 3×2  | `balloon_red`、`bouquet_flower`、`wand_magic`、`party_popper`、`crystal_ball`、`lantern_star`                       |
| 背部 | 3×2  | `backpack_school`、`handbag_fashion`、`umbrella_closed`、`rocket_jet`、`wing_angel`、`cape_night`                   |

生成调用必须传 `transparent_background: true`。面部网格的输出画幅可能比逻辑网格更宽，拆分
时不能强行拉伸为正方形，而应保留整格并等比缩放到目标画布中央。

## 3. 拆分与尺寸处理

1. 检查四角 alpha，确认底色只是查看器预览而不是实际不透明背景。
2. 按声明的列数和行数计算单元格；每边内收约 2.5%，去掉相邻单元偶发的溢出像素。
3. 将单元内容按比例缩放到最大 240×240，居中放入 256×256 的透明 ARGB 画布；禁止直接
   把宽格拉伸成正方形。
4. 使用高质量双三次插值导出非交错 PNG。项目本轮通过 PowerShell `System.Drawing` 完成
   拆分和缩放，没有用脚本重绘或改变生成内容。
5. 生成 6 列装扮联系表和 4 列动物角色联系表，检查裁切、串格、透明杂点和小尺寸轮廓。

最终角色写入 `public/assets/characters/`，装扮写入 `public/assets/items/`。原始生成图位于工具
运行缓存，不是发布依赖；`math_master` 的原始头像和选定身体稿单独保存在
`art_sources/characters/`，避免桌面源文件或工具缓存删除后无法复现正式资源。

## 4. 穿戴校准

角色与装扮都使用 256 坐标系。定位分三层处理：

1. `ANCHORS` 为每个角色定义 head / neck / face / hand / back 基础位置；
2. `ITEM_PLACEMENTS` 对单片镜、翅膀、披风等特殊轮廓追加相对位移和缩放。
3. 用户在外观页所做的微调按“伙伴 + 饰品”写入 `item_adjustments`，在前两层之后应用。

桌宠 `App.tsx` 和控制中心 `PetPreview.tsx` 都调用 `resolvedAnchor`，背部物品在角色下层，
其他槽位在角色上层。默认校准时至少组合一件每槽位代表物，覆盖全部 9 个角色；再检查
25%、50%、75%、100%、125% 五档缩放和键鼠/边缘动作。用户微调用于个人观感调整，不能
代替新素材入库前的默认锚点校准。

## 5. 来源登记与验收

替换或新增图像后执行：

```powershell
node scripts/update-v2-art-registry.mjs
npm run validate:assets
npm run typecheck
npm test
```

`update-v2-art-registry.mjs` 会更新生成素材与原图合成角色正式资源的字节数和 SHA-256；
`validate:assets` 会检查文件
存在、PNG 结构、256×256、alpha、非空画面、来源登记和文档路径。通过自动校验不等于完成
视觉验收，还必须在实际透明窗口中检查地毯边缘、饰品遮挡、缩放和高 DPI 表现。
