import { useEffect, useMemo, useRef, useState } from 'react';
import type { Appearance } from '../shared/types/appearance';
import {
  appearanceAssets,
  CHARACTERS,
  ITEM_ANCHORS,
  ITEMS,
  SCENES,
} from '../data/catalogs/appearance';
import { resolvePetState } from '../features/appearance/pet-state-machine';

export function App() {
  const [appearance, setAppearance] = useState<Appearance>();
  const [levelUp, setLevelUp] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [resting, setResting] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focus, setFocus] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const previousLevel = useRef<number | undefined>(undefined);
  const levelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const allowRandomAction = useRef(true);

  const wake = () => {
    setSleeping(false);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setSleeping(true), 5 * 60_000);
  };

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void Promise.all([
        window.desktopApi.getAppearance(),
        window.desktopApi.getFocus(),
        window.desktopApi.getAppSettings(),
      ])
        .then(([value, focusTimer, settings]) => {
          if (!active) return;
          if (previousLevel.current !== undefined && value.level > previousLevel.current) {
            setLevelUp(true);
            if (levelTimer.current) clearTimeout(levelTimer.current);
            levelTimer.current = setTimeout(() => setLevelUp(false), 3000);
          }
          previousLevel.current = value.level;
          setAppearance(value);
          setFocus(focusTimer.status === 'running' && focusTimer.kind === 'focus');
          setAnimationsEnabled(settings.animationsEnabled);
        })
        .catch((error: unknown) => console.error('无法读取桌宠状态', error));
    };
    refresh();
    wake();
    const refreshTimer = setInterval(refresh, 3000);
    const randomActionTimer = setInterval(() => {
      if (allowRandomAction.current && Math.random() < 0.35) {
        setResting(true);
        setTimeout(() => setResting(false), 1800);
      }
    }, 15_000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
      clearInterval(randomActionTimer);
      if (levelTimer.current) clearTimeout(levelTimer.current);
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
    };
  }, []);

  useEffect(() => {
    allowRandomAction.current = !focus && !sleeping;
  }, [focus, sleeping]);

  useEffect(() => {
    for (const asset of appearanceAssets()) {
      const image = new Image();
      image.src = asset;
    }
  }, []);

  const petState = resolvePetState({
    dragging,
    levelUp,
    interacting,
    focus,
    resting,
    sleeping,
  });
  const resources = useMemo(() => {
    if (!appearance) return undefined;
    return {
      character: CHARACTERS.find((entry) => entry.id === appearance.character)!,
      scene: SCENES.find((entry) => entry.id === appearance.scene)!,
      head: ITEMS.find((entry) => entry.id === appearance.head),
      neck: ITEMS.find((entry) => entry.id === appearance.neck),
    };
  }, [appearance]);

  useEffect(() => setArtworkFailed(false), [appearance?.character]);

  const interact = () => {
    wake();
    setInteracting(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setInteracting(false), 1200);
  };
  const itemStyle = (slot: 'head' | 'neck') => {
    if (!appearance) return undefined;
    const anchor = ITEM_ANCHORS[appearance.character][petState][slot];
    return {
      left: anchor.left,
      top: anchor.top,
      width: anchor.width,
      transform: anchor.rotate ? `rotate(${anchor.rotate}deg)` : undefined,
    };
  };

  return (
    <main className={`pet-stage ${animationsEnabled ? '' : 'motion-disabled'}`}>
      <div
        className={`pet pet-state-${petState}`}
        role="img"
        aria-label={`${resources?.character.name ?? '桌宠'}，拖动可移动`}
        onMouseDown={() => {
          wake();
          setDragging(true);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        {resources?.scene.background && (
          <img
            className="scene-layer scene-background"
            src={resources.scene.background}
            alt=""
            onError={(event) => (event.currentTarget.hidden = true)}
          />
        )}
        {resources && !artworkFailed && (
          <img
            className="pet-character"
            src={resources.character.asset}
            alt=""
            onError={() => setArtworkFailed(true)}
          />
        )}
        {resources && artworkFailed && (
          <span className="pet-artwork-fallback" aria-hidden="true">
            {resources.character.id === 'fox' ? '🦊' : '🐱'}
          </span>
        )}
        {resources?.head && (
          <img
            className="pet-item"
            src={resources.head.asset}
            style={itemStyle('head')}
            alt=""
            onError={(event) => (event.currentTarget.hidden = true)}
          />
        )}
        {resources?.neck && (
          <img
            className="pet-item"
            src={resources.neck.asset}
            style={itemStyle('neck')}
            alt=""
            onError={(event) => (event.currentTarget.hidden = true)}
          />
        )}
        {resources?.scene.foreground && (
          <img
            className="scene-layer scene-foreground"
            src={resources.scene.foreground}
            alt=""
            onError={(event) => (event.currentTarget.hidden = true)}
          />
        )}
        <button
          className="pet-interaction"
          aria-label="摸摸桌宠；双击打开面板"
          onClick={interact}
          onDoubleClick={() => void window.desktopApi.openDashboard()}
        />
      </div>
    </main>
  );
}
