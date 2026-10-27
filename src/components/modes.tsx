import type { ComponentType, SVGProps } from "react"
import {
  GlobeIcon,
  ImageIcon,
  VideoPlayIcon,
  NewsIcon,
  MapPinIcon,
  AcademicIcon,
  CodeIcon,
  ToolsIcon,
} from "./icons"

export type Mode = {
  id: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const MODES: Mode[] = [
  { id: "all", label: "All", Icon: GlobeIcon },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "videos", label: "Videos", Icon: VideoPlayIcon },
  { id: "news", label: "News", Icon: NewsIcon },
  { id: "maps", label: "Maps", Icon: MapPinIcon },
  { id: "academic", label: "Academic", Icon: AcademicIcon },
  { id: "tools", label: "Tools", Icon: ToolsIcon },
]
