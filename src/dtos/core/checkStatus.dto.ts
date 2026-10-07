import { BaseResponse } from "./baseResponse.dto";
import { API_RESPONSE_STATUS } from "./const";
import type { ApiMensajeCodigo } from "./mensajeCodigo";

export class CheckStatus<
  AMC extends ApiMensajeCodigo = ApiMensajeCodigo,
> extends BaseResponse<AMC> {
  /** Respuesta exitosa sin datos (útil para operaciones locales o mocks) */
  static ok(): CheckStatus {
    return new CheckStatus({ status: API_RESPONSE_STATUS.Ok, mensajes: [] });
  }

  /** Respuesta de error con un mensaje legible para el usuario */
  static error(descripcion: string): CheckStatus {
    return new CheckStatus({
      status: API_RESPONSE_STATUS.Error,
      mensajes: [{ codigo: "UNKNOWN_ERROR", descripcion }],
    });
  }
}