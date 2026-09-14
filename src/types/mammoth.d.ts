declare module "mammoth" {
  export interface RawTextResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
    path?: string;
  }

  export function extractRawText(input: Options): Promise<RawTextResult>;
  export function convertToHtml(input: Options): Promise<{ value: string; messages: any[] }>;
}
