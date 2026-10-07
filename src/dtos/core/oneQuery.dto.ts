import { BaseResponse } from "./baseResponse.dto";
import { API_RESPONSE_STATUS } from "./const";
import type { OptionalData } from "./helpers";
import type { ApiMensajeCodigo } from "./mensajeCodigo";

export class OneQuery<
  T,
  AMC extends ApiMensajeCodigo = ApiMensajeCodigo,
> extends BaseResponse<AMC> {
  #data: OptionalData<T>;

  get data(): OptionalData<T> {
    return this.#data;
  }

  set data(value: OptionalData<T>) {
    this.#data = value;
  }

  constructor(response?: Record<string, unknown>) {
    super(response);
    if (!response) return;
    this.#data = response.data as T;
  }

  isOk(): this is this & { data: T } {
    return super.isOk() && this.#data !== undefined && this.#data !== null;
  }

  /** Respuesta exitosa con un único registro (útil para operaciones locales o mocks) */
  static ok<D>(data: D): OneQuery<D> {
    return new OneQuery<D>({ status: API_RESPONSE_STATUS.Ok, mensajes: [], data });
  }

  /** Respuesta de error con un mensaje legible para el usuario */
  static error<D>(descripcion: string): OneQuery<D> {
    return new OneQuery<D>({
      status: API_RESPONSE_STATUS.Error,
      mensajes: [{ codigo: "UNKNOWN_ERROR", descripcion }],
    });
  }
}