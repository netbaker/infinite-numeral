/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'break_eternity.js' {
  export class Decimal {
    constructor(value?: string | number | Decimal);
    static fromString(value: string): Decimal;
    static fromNumber(value: number): Decimal;
    static fromDecimal(value: Decimal): Decimal;
    add(other: string | number | Decimal): Decimal;
    sub(other: string | number | Decimal): Decimal;
    mul(other: string | number | Decimal): Decimal;
    div(other: string | number | Decimal): Decimal;
    pow(other: string | number | Decimal): Decimal;
    log10(): Decimal;
    lt(other: string | number | Decimal): boolean;
    lte(other: string | number | Decimal): boolean;
    gt(other: string | number | Decimal): boolean;
    gte(other: string | number | Decimal): boolean;
    eq(other: string | number | Decimal): boolean;
    floor(): Decimal;
    toString(): string;
    toNumber(): number;
    static zero: Decimal;
    static one: Decimal;
    mag: number;
    sign: number;
    layer: number;
  }
}
