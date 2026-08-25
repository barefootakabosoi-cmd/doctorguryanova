"use client";

import { useEffect } from "react";
import Script from "next/script";

/**
 * Яндекс.Метрика — подключается ТОЛЬКО если задана переменная
 * NEXT_PUBLIC_YANDEX_METRIKA_ID. Без неё компонент ничего не рендерит,
 * поэтому деплой безопасен до добавления переменной в Vercel.
 */
export default function YandexMetrika() {
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

  // Цель phone_click: один делегированный слушатель покрывает все tel:-ссылки сайта.
  useEffect(() => {
    if (!ymId) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('a[href^="tel:"]')) {
        const w = window as typeof window & { ym?: (...args: unknown[]) => void };
        w.ym?.(Number(ymId), "reachGoal", "phone_click");
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ymId]);

  if (!ymId) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${ymId}, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
          });
        `}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${ymId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
