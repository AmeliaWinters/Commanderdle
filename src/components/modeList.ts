import type { ComponentType } from 'react'
import { TbLayoutGrid } from 'react-icons/tb'
import { BsPersonFill } from 'react-icons/bs'
import { FiZoomIn } from 'react-icons/fi'
import { LuNetwork } from 'react-icons/lu'
import { FaQuoteRight } from 'react-icons/fa6'
import type { Mode } from '../types/commander'

/**
 * Display order, labels, and glyphs for the five daily modes. Single source for
 * every place that renders the mode set (nav tabs, archive grid, …).
 */
export const MODE_LIST: { id: Mode; label: string; Icon: ComponentType }[] = [
  { id: 'classic', label: 'Classic', Icon: TbLayoutGrid },
  { id: 'silhouette', label: 'Silhouette', Icon: BsPersonFill },
  { id: 'zoom', label: 'Zoom', Icon: FiZoomIn },
  { id: 'synergy', label: 'Synergy', Icon: LuNetwork },
  { id: 'quote', label: 'Quote', Icon: FaQuoteRight },
]
