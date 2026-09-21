import type { ComponentType, SVGProps } from 'react'
import {
  AcademicIcon,
  CodeIcon,
  GlobeIcon,
  ImageIcon,
  NewsIcon,
  VideoIcon,
} from './icons'

export type Mode = {
  id: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const MODES: Mode[] = [
  { id: 'web', label: 'Web', Icon: GlobeIcon },
  { id: 'images', label: 'Images', Icon: ImageIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
  { id: 'videos', label: 'Videos', Icon: VideoIcon },
  { id: 'academic', label: 'Academic', Icon: AcademicIcon },
  { id: 'code', label: 'Code', Icon: CodeIcon },
]
