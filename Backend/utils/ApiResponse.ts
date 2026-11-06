export default class ApiResponse<T=unknown> {
  constructor(public statusCode:number, public data:T, public message="Success") {}
}
