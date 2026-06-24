import { Route, Routes } from 'react-router-dom'
import { GamePage } from '../pages/GamePage/GamePage'
import { HomePage } from '../pages/HomePage/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { SetlistEditorPage } from '../pages/SetlistEditorPage/SetlistEditorPage'
import { SetlistsPage } from '../pages/SetlistsPage/SetlistsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/setlists" element={<SetlistsPage />} />
      <Route path="/setlists/:setlistId" element={<SetlistEditorPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

