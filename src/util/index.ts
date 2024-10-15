export const isDev = process.env.NODE_ENV !== "production";
export const logger = isDev ? console : undefined;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};


type ObjectArray<T> = Extract<T, object>
type ObjectType<T> = ObjectArray<T>
type ArrayType<T> = T extends ObjectArray<T> & { length: number } ? T : never

export function isObject<T>(obj: T): obj is ObjectType<T> {
  return obj !== null && obj !== undefined && !Array.isArray(obj) && typeof obj === 'object';
}

export function isArray<T>(array: T): array is ArrayType<T> {
  return typeof array === 'object' && Array.isArray(array) && array !== null && array !== undefined;
}

export function isNumber<T>(n: T) {
  return !isNaN(parseFloat(n as string)) && isFinite(n as number);
}

export function toCapitalized(words: string) {
  return words.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
}

export function sleep(delayInSecond: number) {
  return new Promise((resolve) => setTimeout(resolve, delayInSecond * 1000));
}

export function removeDuplicateObjArray<T>(arr: Prettify<T>[], key: keyof T) {
  return [...new Map(arr.map((item) => [item[key], item])).values()];
}

export function removeDuplicateArray<T>(arr: Array<T>) {
  return [...new Set(arr)];
}

export function isValidJSON(jsonString?: string) {
  if (jsonString != undefined) {
    try {
      var handleJsonString = jsonString
        .replace(/(\t|\n|\r|\  )/g, '')
        .replace(/\": "/g, '":"')
        .replace(/\,}/g, '}')
        .replace(/\,]/g, ']');
      var obj = JSON.parse(handleJsonString);
      if (obj && typeof obj === 'object') {
        return obj;
      }
    } catch (e) { }
  }
  return false;
}

export function isValidUrl(link: string | URL){
  try {
    const url = new URL(link);
    const host = url.host;
    const hostSplit = host.split('.');
    const ext = hostSplit.at(-1) || '';
    return Boolean(url) && hostSplit.length > 1 && ext.length > 1 && ["http://", "https://"].some(v => url.href.startsWith(v));
  }
  catch {
    return false;
  }
}


export function arraySplitting<TData>(array: TData[], chunk: number) {
  let arr = array;
  let lengthOfArr = arr.length;
  let newArr = [] as TData[];
  let lastArr = [] as TData[];
  if ((arr.length % chunk) === 0) {
    newArr = [...arr]
  } else {
    let mode = lengthOfArr % chunk
    newArr = arr.slice(0, -(mode))
    lastArr = arr.slice(lengthOfArr - mode, lengthOfArr)
  }
  let arrSplitting = [...Array(newArr.length / chunk).keys()].map(() => arr.splice(0, chunk));
  arrSplitting = lastArr.length > 0
    ? [...arrSplitting, lastArr]
    : arrSplitting

  return arrSplitting
}

export const encodeJsonBtoa = (obj:object) => {
  let urlJson = encodeURIComponent(JSON.stringify(obj))
  return btoa(unescape(urlJson))
}

export const decodeJsonBtoa = (data:string) => {
  var decodeAtob = atob(data)
  var dataParsed = JSON.parse(decodeURIComponent(escape(decodeAtob)))
  return dataParsed
}