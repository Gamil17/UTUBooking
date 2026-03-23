// Allow TypeScript to resolve CSS side-effect imports (e.g. import './globals.css')
// This is normally provided by next-env.d.ts after `next dev` generates .next/dev/types/routes.d.ts
// Declaring it here ensures the IDE is happy before the first build.
declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}
