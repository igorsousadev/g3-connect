export type SegmentStatus = 'active' | 'inactive'

export interface Segment {
  id: string
  name: string
  description: string
  status: SegmentStatus
  created_at: string
  updated_at: string
}

export type SegmentInsert = Omit<Segment, 'id' | 'created_at' | 'updated_at'>
export type SegmentUpdate = Partial<SegmentInsert>
