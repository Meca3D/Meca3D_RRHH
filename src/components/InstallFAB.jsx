// src/components/InstallFAB.jsx
import { Fab } from '@mui/material'
import InstallMobileIcon from '@mui/icons-material/InstallMobile'
import { useInstallPrompt } from '../stores/useInstallPrompt.js'

export default function InstallFAB() {
  const { canInstall, deferred, setDeferred } = useInstallPrompt()
  if (!canInstall) return null

  return (
    <Fab
      color="primary"
      onClick={async () => {
        try {
          await deferred.prompt()
        } finally {
          setDeferred(null)
        }
      }}
      sx={{ position: 'fixed', right: 16, bottom: 16 }}
      aria-label="Instalar app"
    >
      <InstallMobileIcon />
    </Fab>
  )
}
