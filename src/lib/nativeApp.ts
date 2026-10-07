import { Capacitor } from '@capacitor/core'

/*
 * The toolkit also ships as an iPhone and iPad app: the same build, loaded
 * from the app bundle by a native shell (Capacitor, see ios/ and
 * capacitor.config.json). On the web this flag is false and everything here
 * falls through to the browser's own behavior.
 */
export const isNativeApp = Capacitor.isNativePlatform()

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    // readAsDataURL yields "data:<type>;base64,<data>"; the plugin wants the data alone.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

/*
 * Hand a generated file to the visitor. A browser saves it from a link with
 * a download attribute. The app's web view ignores that attribute, so there
 * the file is written to the app's cache and offered through the iOS share
 * sheet (Save to Files, Save Image, AirDrop, Mail).
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!isNativeApp) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  })
  try {
    await Share.share({ files: [uri] })
  } catch {
    // Closing the share sheet without choosing anything rejects; nothing to do.
  }
}
