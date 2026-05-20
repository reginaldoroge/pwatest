export const getCoordinates = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocalização não é suportada pelo seu navegador.")
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`
        
        let address = "Buscando endereço..."
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)
          
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: {
              'User-Agent': 'PontoSeguroPWA/1.0',
              'Accept-Language': 'pt-BR'
            },
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          
          const data = await response.json()
          if (data && data.address) {
            const road = data.address.road || data.address.suburb || ""
            const houseNumber = data.address.house_number ? `, ${data.address.house_number}` : ""
            const city = data.address.city || data.address.town || data.address.municipality || ""
            
            if (road) {
              address = `${road}${houseNumber}${city ? ' - ' + city : ''}`
            } else {
              address = data.display_name.split(',').slice(0, 3).join(', ')
            }
          } else {
            address = "Coordenadas registradas"
          }
        } catch (e) {
          console.error("Erro no reverse geocoding:", e)
          address = "Endereço indisponível (offline)"
        }

        resolve({ latitude, longitude, accuracy, mapsLink, address })
      },
      (error) => {
        console.error("Erro de localização:", error)
        let errMsg = "Erro desconhecido ao obter a localização."
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errMsg = "Acesso à localização negado pelo usuário."
            break
          case error.POSITION_UNAVAILABLE:
            errMsg = "Informações de localização indisponíveis."
            break
          case error.TIMEOUT:
            errMsg = "Tempo limite atingido para obter localização."
            break
        }
        reject(errMsg)
      },
      options
    )
  })
}
