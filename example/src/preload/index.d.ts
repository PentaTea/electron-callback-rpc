import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      }
    }
  }
}
