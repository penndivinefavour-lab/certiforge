/// <reference types="next" />
/// <reference types="next/image-types/global" />

import type { NextRequest } from 'next/server'

declare module 'next/server' {
  export { NextRequest }
}
