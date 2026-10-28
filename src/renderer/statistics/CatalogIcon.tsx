import { useEffect, useState } from 'react';

/**
 * 目录素材图标：加载失败时回退到通用 PNG 图标，避免出现浏览器默认的破图。
 */
export function CatalogIcon({
  src,
  fallback,
  alt = '',
  className,
}: {
  src?: string;
  fallback: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <img
      className={className}
      src={failed || !src ? fallback : src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
