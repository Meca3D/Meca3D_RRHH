// src/components/UI/InstallFAB.jsx
 import { Fab } from '@mui/material'
 import InstallMobileIcon from '@mui/icons-material/InstallMobile'
 import { useInstallPrompt } from '../../stores/useInstallPrompt.js'
 import { useUIStore } from '../../stores/uiStore'

 export default function InstallFAB() {
   const { canInstall, deferred, setDeferred } = useInstallPrompt()
   const snackbarOpen = useUIStore((s) => s.snackbar.open)
   if (!canInstall) return null

   const handleClick = async () => {
     try { await deferred.prompt() } finally { setDeferred(null) }
   }

   return (
     <Fab
       color="primary"
       aria-label="Instalar app"
       onClick={handleClick}
       sx={{ position: 'fixed', right: 16, bottom: snackbarOpen ? 88 : 16, zIndex: (t) => t.zIndex.snackbar + 1 }}
     >
       <InstallMobileIcon />
     </Fab>
   )
 }
