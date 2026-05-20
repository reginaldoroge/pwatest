const CAMERA_SIZE = {
  width: { ideal: 640 },
  height: { ideal: 480 }
}

export async function requestCameraStream(facingMode = 'user') {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode, ...CAMERA_SIZE },
      audio: false
    })
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      })
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
    }
  }
}

export function stopCameraStream(stream) {
  stream?.getTracks().forEach(track => track.stop())
}
