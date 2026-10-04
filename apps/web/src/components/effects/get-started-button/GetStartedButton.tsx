import React, { useEffect, useRef, useMemo } from 'react';
import buttonHtml from './get-started-button.html?raw';
import './styles.css';

export interface GetStartedButtonProps {
  onClick?: () => void;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export function GetStartedButton({
  onClick,
  label = 'CHECK DEAL',
  size = 'default',
  className = '',
  style,
  id,
}: GetStartedButtonProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Handle click messages posted from inside the sandbox iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GET_STARTED_CLICK') {
        onClick?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClick]);

  // Prepared customized HTML string
  const customSrcDoc = useMemo(() => {
    let html = buttonHtml;
    if (label) {
      // Replace the button label while preserving all WebGL shaders & interactions byte-for-byte
      html = html.replace(
        /<span class="label" aria-hidden="true">.*?<\/span>/,
        `<span class="label" aria-hidden="true">${label.replace(/[<>&"']/g, '')}</span>`
      ).replace('aria-label="Get Started"', `aria-label="${label.replace(/[<>&"']/g, '')}"`)
       .replace('aria-label="Sign up"', `aria-label="${label.replace(/[<>&"']/g, '')}"`);
    }

    const minU = size === 'sm' ? '0.28px' : size === 'lg' ? '0.33px' : '0.30px';
    const maxU = size === 'sm' ? '0.31px' : size === 'lg' ? '0.36px' : '0.34px';
    html = html.replace(
      /--u:\s*[^;]+;/,
      `--u: clamp(${minU}, calc(100vw / 820), ${maxU});`
    );

    return html;
  }, [label, size]);

  const sizeClass =
    size === 'sm'
      ? 'get-started-button-frame--sm'
      : size === 'lg'
      ? 'get-started-button-frame--lg'
      : '';

  return (
    <div
      id={id}
      className={`get-started-button-frame ${sizeClass} ${className}`}
      style={style}
    >
      <iframe
        ref={frameRef}
        title="Get Started Button"
        srcDoc={customSrcDoc}
        sandbox="allow-scripts allow-same-origin"
        loading="eager"
        scrolling="no"
        aria-label={label}
      />
    </div>
  );
}

export function Scene() {
  return (
    <div className="effect-frame flex items-center justify-center p-4">
      <GetStartedButton />
    </div>
  );
}

export default GetStartedButton;
