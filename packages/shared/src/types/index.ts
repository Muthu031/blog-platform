export type ApiHello = {
  message: string
}

export type UserDTO = {
  id: string
  name: string
  email?: string
}

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  message?: string
  error?: string
}