import { Database } from "./DatabaseDefinitions"

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      clusters: any
    }
    // interface PageData {
    //   session: Session | null
    // }
    // interface Error {}
    // interface Platform {}
  }
}

export {}
