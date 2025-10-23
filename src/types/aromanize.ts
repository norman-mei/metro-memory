declare module 'aromanize' {
  export default class Aromanize {
    public static romanize(str: string): string
    public static hangulToLatin(str: string, type: string): string
  }
}
