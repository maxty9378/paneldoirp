declare module 'css-paint-polyfill' {
  const cssPaintPolyfill: any;
  export default cssPaintPolyfill;
}

// Расширяем интерфейс CSS для поддержки paintWorklet
declare global {
  interface CSS {
    paintWorklet?: {
      addModule(url: string): Promise<void>;
    };
  }
} 