import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from 'react';
import type { Appearance, ItemSlot } from '../shared/types/appearance';
import type { PetActivityEvent } from '../shared/types/economy';
import { PET_ART_LEFT, PET_ART_SIZE, PET_ART_TOP, PET_WINDOW_SIZE } from '../shared/constants/pet';
import type { ItemAnchor } from '../data/catalogs/appearance';
import {
  appearanceAssets,
  CHARACTERS,
  ITEMS,
  SCENES,
  itemById,
  resolvedAnchor,
} from '../data/catalogs/appearance';
import { resolvePetState } from '../features/appearance/pet-state-machine';
import './pet.css';

/** 角色素材是 256×256 画布，按 PET_ART_SIZE 等比缩放。 */
const ART_SCALE = PET_ART_SIZE / 256;
/** 指针位移超过该像素才视为拖动，避免点击时轻微抖动被误判。 */
const DRAG_THRESHOLD = 6;
const CLICK_DELAY = 250;
const SPEECH_DURATION = 5000;
const LEVEL_UP_DURATION = 3000;
const SLEEP_DELAY = 5 * 60_000;

const FALLBACK_EMOJI: Readonly<Record<string, string>> = {
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  penguin: '🐧',
  tiger: '🐯',
  turtle: '🐢',
  hedgehog: '🦔',
  chipmunk: '🐿️',
};

const IDLE_LINES = [
  '今天也要一起加油呀。',
  '双击我，可以打开控制中心。',
  '按住我，可以拖到桌面任意角落。',
  '记得喝口水，站起来伸个懒腰。',
];
const FOCUS_LINES = [
  '专注模式进行中，我帮你看着时间。',
  '再坚持一会儿，就快完成了。',
  '认真工作的你最好看。',
];
const SLEEP_LINES = ['呼…呼…', '我打个盹，有事叫我。', '再陪我眯五分钟…'];

function pickLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

function idleLine(level: number): string {
  const lines = [...IDLE_LINES];
  if (level >= 20) lines.push(`已经陪你到 Lv.${level} 啦，真厉害。`);
  else if (level >= 10) lines.push(`Lv.${level} 了，我们继续一起成长。`);
  else lines.push('多陪我一会儿，就能解锁新伙伴啦。');
  return pickLine(lines);
}

function clickSpeech(level: number, focusing: boolean, isSleeping: boolean): string {
  if (isSleeping) return pickLine(SLEEP_LINES);
  if (focusing) return pickLine(FOCUS_LINES);
  return idleLine(level);
}

function itemTransform(anchor: ItemAnchor): string | undefined {
  const transforms: string[] = [];
  if (anchor.rotate) transforms.push(`rotate(${anchor.rotate}deg)`);
  if (anchor.flip) transforms.push('scaleX(-1)');
  return transforms.length > 0 ? transforms.join(' ') : undefined;
}

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function App() {
  const [appearance, setAppearance] = useState<Appearance>();
  const [levelUp, setLevelUp] = useState(false);
  const [resting, setResting] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focus, setFocus] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [inputReactionsEnabled, setInputReactionsEnabled] = useState(true);
  const [inputReaction, setInputReaction] = useState<'keyboard' | 'mouse' | null>(null);
  const [celebratingDrop, setCelebratingDrop] = useState(false);
  const [edge, setEdge] = useState<'free' | 'bottom' | 'left' | 'right'>('free');
  const [speech, setSpeech] = useState<string>();
  const [artworkFailed, setArtworkFailed] = useState(false);
  const previousLevel = useRef<number | undefined>(undefined);
  const levelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const allowRandomAction = useRef(true);
  const dragSession = useRef<DragSession | undefined>(undefined);
  const inputTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputReactionsRef = useRef(true);
  const animationsRef = useRef(true);

  const hideSpeech = () => {
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = undefined;
    setSpeech(undefined);
  };

  const showSpeech = (text: string) => {
    if (speechTimer.current) clearTimeout(speechTimer.current);
    setSpeech(text);
    speechTimer.current = setTimeout(() => {
      speechTimer.current = undefined;
      setSpeech(undefined);
    }, SPEECH_DURATION);
  };

  const wake = () => {
    setSleeping(false);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setSleeping(true), SLEEP_DELAY);
  };

  const cancelPendingClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = undefined;
  };

  const scheduleClickSpeech = () => {
    cancelPendingClick();
    clickTimer.current = setTimeout(() => {
      clickTimer.current = undefined;
      showSpeech(clickSpeech(appearance?.level ?? 1, focus, sleeping));
    }, CLICK_DELAY);
  };

  const endDrag = () => {
    setDragging(false);
    void window.desktopApi
      .endPetDrag()
      .catch((error: unknown) => console.error('无法结束桌宠拖动', error));
  };

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void Promise.all([
        window.desktopApi.getAppearance(),
        window.desktopApi.getFocus(),
        window.desktopApi.getAppSettings(),
      ])
        .then(([nextAppearance, nextFocus, settings]) => {
          if (!active) return;
          if (previousLevel.current !== undefined && nextAppearance.level > previousLevel.current) {
            setLevelUp(true);
            if (levelTimer.current) clearTimeout(levelTimer.current);
            levelTimer.current = setTimeout(() => {
              levelTimer.current = undefined;
              setLevelUp(false);
            }, LEVEL_UP_DURATION);
            showSpeech(`升级到 Lv.${nextAppearance.level}`);
          }
          previousLevel.current = nextAppearance.level;
          setAppearance(nextAppearance);
          setFocus(nextFocus.status === 'running' && nextFocus.kind === 'focus');
          setAnimationsEnabled(settings.animationsEnabled);
          setInputReactionsEnabled(settings.inputReactionsEnabled);
        })
        .catch((error: unknown) => console.error('无法读取桌宠状态', error));
    };
    refresh();
    wake();
    const refreshTimer = setInterval(refresh, 3000);
    const randomActionTimer = setInterval(() => {
      if (!allowRandomAction.current || Math.random() >= 0.35) return;
      setResting(true);
      if (restTimer.current) clearTimeout(restTimer.current);
      restTimer.current = setTimeout(() => {
        restTimer.current = undefined;
        setResting(false);
      }, 1800);
    }, 15_000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
      clearInterval(randomActionTimer);
      if (levelTimer.current) clearTimeout(levelTimer.current);
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      if (restTimer.current) clearTimeout(restTimer.current);
      if (speechTimer.current) clearTimeout(speechTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (inputTimer.current) clearTimeout(inputTimer.current);
      if (dropTimer.current) clearTimeout(dropTimer.current);
    };
  }, []);

  useEffect(() => {
    inputReactionsRef.current = inputReactionsEnabled;
  }, [inputReactionsEnabled]);

  useEffect(() => {
    animationsRef.current = animationsEnabled;
  }, [animationsEnabled]);

  useEffect(
    () =>
      window.desktopApi.onPetActivity((activity: PetActivityEvent) => {
        if (activity.edge) setEdge(activity.edge);
        if (typeof activity.animationsEnabled === 'boolean')
          setAnimationsEnabled(activity.animationsEnabled);
        if (typeof activity.inputReactionsEnabled === 'boolean')
          setInputReactionsEnabled(activity.inputReactionsEnabled);
        if (activity.drops.length > 0) {
          const latest = activity.drops[activity.drops.length - 1];
          setCelebratingDrop(true);
          if (dropTimer.current) clearTimeout(dropTimer.current);
          dropTimer.current = setTimeout(() => setCelebratingDrop(false), 2600);
          const item = itemById(latest.itemId);
          showSpeech(`发现了${item?.name ?? '新装扮'}！`);
          void window.desktopApi.getAppearance().then(setAppearance);
          return;
        }
        if (
          !animationsRef.current ||
          !inputReactionsRef.current ||
          activity.keyboard + activity.mouse === 0
        )
          return;
        setInputReaction(activity.keyboard >= activity.mouse ? 'keyboard' : 'mouse');
        if (inputTimer.current) clearTimeout(inputTimer.current);
        inputTimer.current = setTimeout(() => setInputReaction(null), 900);
      }),
    [],
  );

  useEffect(() => {
    allowRandomAction.current = !focus && !sleeping;
  }, [focus, sleeping]);

  useEffect(() => {
    setArtworkFailed(false);
  }, [appearance?.character]);

  useEffect(() => {
    for (const asset of appearanceAssets()) {
      const image = new Image();
      image.src = asset;
    }
  }, []);

  const scene = useMemo(() => {
    const sceneId = appearance?.scene;
    return SCENES.find((entry) => entry.id === sceneId) ?? SCENES[0];
  }, [appearance?.scene]);

  const character = appearance
    ? CHARACTERS.find((entry) => entry.id === appearance.character)
    : undefined;

  const equipped = useMemo(() => {
    if (!appearance) return [];
    // 叠放顺序：背部最底、头部最上；同一 z-index 内依靠 DOM 顺序决定上下。
    const stackOrder: readonly ItemSlot[] = ['back', 'hand', 'neck', 'face', 'head'];
    return stackOrder.flatMap((slot) => {
      const itemId = appearance.equipped[slot];
      if (!itemId) return [];
      const item = ITEMS.find((entry) => entry.id === itemId && entry.slot === slot);
      return item
        ? [{ slot, item, anchor: resolvedAnchor(appearance.character, slot, item.id) }]
        : [];
    });
  }, [appearance]);

  const petState = resolvePetState({
    dragging,
    levelUp,
    focus,
    resting,
    sleeping,
    inputReaction,
    celebratingDrop,
    edge,
  });
  const petName = character?.name ?? '桌宠';

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragSession.current) return;
    wake();
    cancelPendingClick();
    dragSession.current = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      moved: false,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    void window.desktopApi
      .beginPetDrag()
      .catch((error: unknown) => console.error('无法开始桌宠拖动', error));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId || session.moved) return;
    // 主进程跟随光标移动窗口，窗口内坐标几乎不变，必须用屏幕坐标判断拖动。
    const dx = event.screenX - session.startX;
    const dy = event.screenY - session.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) session.moved = true;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragSession.current = undefined;
    endDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!session.moved) scheduleClickSpeech();
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragSession.current = undefined;
    endDrag();
  };

  const handleLostPointerCapture = () => {
    if (!dragSession.current) return;
    dragSession.current = undefined;
    endDrag();
  };

  const handleDoubleClick = () => {
    cancelPendingClick();
    hideSpeech();
    wake();
    void window.desktopApi
      .openDashboard()
      .catch((error: unknown) => console.error('无法打开控制中心', error));
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    wake();
    void window.desktopApi
      .openPetMenu()
      .catch((error: unknown) => console.error('无法打开桌宠菜单', error));
  };

  return (
    <main
      className={`companion-stage companion-window${animationsEnabled ? '' : ' motion-disabled'}`}
      style={{
        width: PET_WINDOW_SIZE,
        height: PET_WINDOW_SIZE,
        background: scene.theme.background,
      }}
    >
      {scene.background && (
        <img
          className="companion-scene-background"
          src={scene.background}
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {scene.theme.ground && (
        <div
          className="companion-scene-ground"
          style={
            {
              background: scene.theme.ground,
              '--ground-accent': scene.theme.groundAccent,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      )}
      {scene.decorations.map((decoration, index) => (
        <img
          key={`${decoration.asset}-${index}`}
          className="companion-scene-decoration"
          src={decoration.asset}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            left: decoration.x,
            top: decoration.y,
            width: decoration.width,
            opacity: decoration.opacity,
            zIndex: decoration.z ?? 1,
            transform: decoration.flip ? 'scaleX(-1)' : undefined,
          }}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ))}
      <div
        className={`companion-root companion-state-${petState}`}
        role="img"
        aria-label={`${petName}，拖动可移动；双击打开控制中心，右键打开菜单`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragStart={(event) => event.preventDefault()}
      >
        {character && !artworkFailed && (
          <img
            className="companion-character"
            src={character.asset}
            alt=""
            draggable={false}
            style={{
              left: PET_ART_LEFT,
              top: PET_ART_TOP,
              width: PET_ART_SIZE,
              height: PET_ART_SIZE,
            }}
            onError={() => setArtworkFailed(true)}
          />
        )}
        {character && artworkFailed && (
          <span
            className="companion-fallback"
            aria-hidden="true"
            style={{
              left: PET_ART_LEFT,
              top: PET_ART_TOP,
              width: PET_ART_SIZE,
              height: PET_ART_SIZE,
            }}
          >
            {FALLBACK_EMOJI[character.id] ?? '🐾'}
          </span>
        )}
        {equipped.map(({ slot, item, anchor }) => (
          <img
            key={slot}
            className={`companion-item${slot === 'back' ? ' companion-item-back' : ''}`}
            src={item.asset}
            alt=""
            draggable={false}
            style={{
              left: PET_ART_LEFT + anchor.left * ART_SCALE,
              top: PET_ART_TOP + anchor.top * ART_SCALE,
              width: anchor.width * ART_SCALE,
              // 按美术契约，背部饰品位于角色下层；其余四槽在角色上层。
              zIndex: slot === 'back' ? 1 : 3,
              transform: itemTransform(anchor),
            }}
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        ))}
      </div>
      {speech && (
        <div className="companion-speech" role="status" aria-live="polite">
          {speech}
        </div>
      )}
    </main>
  );
}
