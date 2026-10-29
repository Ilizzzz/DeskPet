import type { CSSProperties } from 'react';
import { ITEM_SLOTS } from '../../shared/types/appearance';
import type { Appearance } from '../../shared/types/appearance';
import {
  CHARACTERS,
  ITEMS,
  SCENES,
  UI_ICONS,
  resolvedAnchor,
} from '../../data/catalogs/appearance';
import { CatalogIcon } from './CatalogIcon';
import { isTransparentScene, sceneBackgroundStyle } from './scene-style';

/** 预览沿用桌宠的 220×220 舞台与 256 画布锚点，保证和桌面上的外观一致。 */
const CHARACTER_LEFT = 30;
const CHARACTER_TOP = 44;
const CHARACTER_SIZE = 160;
const ART_SIZE = 256;
const SCALE = CHARACTER_SIZE / ART_SIZE;

/** 静态外观预览：场景 + 角色 + 五槽位饰品，只负责展示，不处理交互。 */
export function PetPreview({ appearance }: { appearance: Appearance }) {
  const character = CHARACTERS.find((entry) => entry.id === appearance.character) ?? CHARACTERS[0];
  const scene = SCENES.find((entry) => entry.id === appearance.scene) ?? SCENES[0];
  const equipped = ITEM_SLOTS.flatMap((slot) => {
    const item = ITEMS.find((entry) => entry.id === appearance.equipped[slot]);
    if (!item) return [];
    const adjustment = appearance.itemAdjustments.find(
      (entry) => entry.characterId === character.id && entry.itemId === item.id,
    );
    const anchor = resolvedAnchor(character.id, slot, item.id, adjustment);
    const transform = [
      anchor.rotate ? `rotate(${anchor.rotate}deg)` : '',
      anchor.flip ? 'scaleX(-1)' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return [
      {
        slot,
        item,
        style: {
          left: CHARACTER_LEFT + anchor.left * SCALE,
          top: CHARACTER_TOP + anchor.top * SCALE,
          width: anchor.width * SCALE,
          zIndex: slot === 'back' ? 1 : 3,
          transform: transform || undefined,
        } satisfies CSSProperties,
      },
    ];
  });
  const equippedNames = equipped.map((entry) => entry.item.name);
  const label = `${character.name} · ${scene.name}${
    equippedNames.length ? ` · ${equippedNames.join('、')}` : ' · 未佩戴饰品'
  }`;

  return (
    <div className="pet-preview">
      <div
        className={
          isTransparentScene(scene) ? 'pet-preview-stage transparent' : 'pet-preview-stage'
        }
        role="img"
        aria-label={`当前外观预览：${label}`}
      >
        <div className="pet-preview-scene" style={sceneBackgroundStyle(scene)} />
        {scene.theme.ground && (
          <div
            className="pet-preview-ground"
            style={
              {
                background: scene.theme.ground,
                '--ground-accent': scene.theme.groundAccent,
              } as CSSProperties
            }
          />
        )}
        {scene.decorations
          .filter((decoration) => (decoration.z ?? 1) < 4)
          .map((decoration, index) => (
            <img
              className="pet-preview-deco"
              key={`${scene.id}-back-${index}`}
              src={decoration.asset}
              alt=""
              style={{
                left: decoration.x,
                top: decoration.y,
                width: decoration.width,
                zIndex: decoration.z ?? 1,
                opacity: decoration.opacity,
                transform: decoration.flip ? 'scaleX(-1)' : undefined,
              }}
              onError={(event) => (event.currentTarget.hidden = true)}
            />
          ))}
        {equipped
          .filter(({ slot }) => slot === 'back')
          .map(({ item, style }) => (
            <img
              className="pet-preview-item"
              key={item.id}
              src={item.asset}
              alt=""
              style={style}
              onError={(event) => (event.currentTarget.hidden = true)}
            />
          ))}
        <CatalogIcon
          className="pet-preview-character"
          src={character.asset}
          fallback={UI_ICONS.app}
          alt=""
        />
        {equipped
          .filter(({ slot }) => slot !== 'back')
          .map(({ item, style }) => (
            <img
              className="pet-preview-item"
              key={item.id}
              src={item.asset}
              alt=""
              style={style}
              onError={(event) => (event.currentTarget.hidden = true)}
            />
          ))}
        {scene.decorations
          .filter((decoration) => (decoration.z ?? 1) >= 4)
          .map((decoration, index) => (
            <img
              className="pet-preview-deco front"
              key={`${scene.id}-front-${index}`}
              src={decoration.asset}
              alt=""
              style={{
                left: decoration.x,
                top: decoration.y,
                width: decoration.width,
                zIndex: decoration.z ?? 4,
                opacity: decoration.opacity,
                transform: decoration.flip ? 'scaleX(-1)' : undefined,
              }}
              onError={(event) => (event.currentTarget.hidden = true)}
            />
          ))}
      </div>
      <p className="pet-preview-caption">{label}</p>
    </div>
  );
}
