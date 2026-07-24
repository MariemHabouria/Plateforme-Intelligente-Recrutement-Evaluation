import { Router } from 'express'
import { searchService } from '../services/search.service'
import { protect } from '../middlewares/auth'

const router = Router()

router.get('/', protect, async (req, res) => {
  try {
    const q = (req.query.q as string) || ''
    const results = await searchService.globalSearch(q)
    res.json({ success: true, ...results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur lors de la recherche' })
  }
})

export default router