'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Link as LinkIcon,
  Zap,
} from 'lucide-react'
import { formatUnits } from 'viem'
import { JobState } from '@/lib/contracts/jobState'
import type { Job } from '@/lib/hooks/useAllJobs'

const TUSDT_DECIMALS = 18

type TrancheCardProps = {
  id: string
  title: string
  capital: string
  agents: number
  status: string
  href?: string
}

interface TrancheBlockProps {
  tranche?: TrancheCardProps
  job?: Job
}

/** Human-friendly title when we only have a hash. */
function deriveJobTitle(job: Job): string {
  // taskHash is bytes32 (0x + 64 hex chars). Use first 20 chars of hash as a
  // stable placeholder until on-chain metadata is available.
  if (job.taskHash && job.taskHash.length >= 22) {
    return `Tranche ${job.taskHash.slice(0, 20)}`
  }
  return `Job #${job.jobId.toString()}`
}

function mapJobStateToStatus(state: number): string {
  switch (state) {
    case JobState.Open:
      return 'QUEUED'
    case JobState.Funded:
      return 'ISSUED'
    case JobState.Submitted:
      return 'GRADING'
    case JobState.Completed:
      return 'SETTLED'
    case JobState.Rejected:
      return 'REJECTED'
    case JobState.Expired:
      return 'EXPIRED'
    default:
      return 'UNKNOWN'
  }
}

function jobToCardProps(job: Job): TrancheCardProps {
  const amount = Number(formatUnits(job.amount, TUSDT_DECIMALS))
  const capital = Number.isFinite(amount)
    ? `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`
    : '0 USDT'
  return {
    id: job.jobId.toString(),
    title: deriveJobTitle(job),
    capital,
    agents: job.state === JobState.Submitted ? 1 : 0,
    status: mapJobStateToStatus(job.state),
    href: `/project/${job.jobId.toString()}`,
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'SETTLED':
      return { color: 'text-primary', icon: CheckCircle2, label: 'Resolved', rail: 'bg-primary' };
    case 'EXECUTING':
      return { color: 'text-primary', icon: Zap, label: status === 'GRADING' ? 'Grading' : 'Executing', rail: 'bg-primary' };
    case 'FAILED':
    case 'REJECTED':
      return { color: 'text-destructive', icon: AlertCircle, label: status === 'REJECTED' ? 'Rejected' : 'Failed', rail: 'bg-destructive' };
    case 'EXPIRED':
      return { color: 'text-muted-foreground', icon: RotateCcw, label: status === 'EXPIRED' ? 'Expired' : 'Expired', rail: 'bg-muted-foreground' };
    case 'ISSUED':
      return { color: 'text-secondary', icon: Clock, label: 'Issued', rail: 'bg-secondary' };
    case 'QUEUED':
    default:
      return { color: 'text-secondary', icon: Clock, label: 'In Queue', rail: 'bg-secondary' };
  }
}

export function TrancheBlock({ tranche, job }: TrancheBlockProps) {
  const card = job ? jobToCardProps(job) : tranche
  if (!card) return null

  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 80, damping: 25 })
  const mouseYSpring = useSpring(y, { stiffness: 80, damping: 25 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-6, 6])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    x.set(mouseX / rect.width - 0.5)
    y.set(mouseY / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const status = getStatusConfig(card.status)

  const cardInner = (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY }}
      className="perspective-1000 preserve-3d group cursor-pointer h-full"
    >
      <motion.div
        whileHover={{ y: -12, scale: 1.02, transition: { duration: 0.5, ease: 'easeOut' } }}
        className={`relative w-full h-full bg-white backdrop-blur-xl border border-black/5 shadow-2xl transition-all duration-700 ${status.isPulse ? 'border-primary/20' : 'border-black/5 hover:border-primary/20'}`}
      >
        <div className={`absolute top-0 left-0 w-[3px] h-full ${status.rail} opacity-60`} />

        <div className="absolute top-6 right-6 z-20">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.2 }}
            className={`w-12 h-12 bg-black/5 border border-black/5 flex items-center justify-center rounded-sm transition-all shadow-sm group-hover:shadow-primary/10`}
          >
            <ShieldCheck className={`w-7 h-7 ${status.color}`} />
          </motion.div>
        </div>

        <div className="pl-14 pr-10 py-12 flex flex-col min-h-[420px] justify-between relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col gap-3">
              <div className="px-3 py-1 bg-black/5 border border-black/5 flex items-center gap-3">
                <LinkIcon className="w-3.5 h-3.5 text-black/20" />
                <span className="text-[11px] font-mono font-bold text-black/60 tracking-widest uppercase">#{card.id}</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-black/30 italic ml-1 font-mono">Ledger Entry</span>
            </div>

            <div className={`flex items-center gap-3 px-4 py-2 bg-black/5 border border-black/5 backdrop-blur-md mr-16`}>
              <status.icon className={`w-4 h-4 ${status.color} ${status.isPulse ? 'animate-pulse' : ''}`} />
              <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${status.color} italic`}>{status.label}</span>
            </div>
          </div>

          <div className="relative mb-10">
            <h3 className="text-[2rem] font-bold uppercase tracking-tighter font-mono leading-[1] italic text-black group-hover:text-primary transition-colors duration-500">
              {card.title}
            </h3>
            <div className="mt-6 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full ${status.isPulse ? 'bg-primary animate-signal-pulse' : 'bg-primary/20 shadow-none'}`} />
              <span className="text-[10px] font-mono font-bold text-black/40 italic uppercase tracking-[0.3em] opacity-80">Deterministic Routing</span>
            </div>
          </div>

          <div className="space-y-4 mt-auto">
            <div className="bg-black/5 border border-black/5 p-6 flex items-center justify-between border-l-2 border-primary/20">
              <span className="text-[10px] text-black/40 uppercase font-bold tracking-[0.4em] italic font-mono">Settlement Cap</span>
              <span className="text-2xl font-mono font-bold tracking-tighter italic text-black">{card.capital}</span>
            </div>
            <div className="bg-black/5 border border-black/5 p-6 flex items-center justify-between border-l-2 border-black/10">
              <span className="text-[10px] text-black/40 uppercase font-bold tracking-[0.4em] italic font-mono">Agent Capacity</span>
              <span className="text-2xl font-mono font-bold tracking-tighter italic text-black">{card.agents} / 25</span>
            </div>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700">
            <div className="flex items-center gap-4 px-6 py-2.5 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg shadow-primary/20">
              Launch Explorer <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      </motion.div>
    </motion.div>
  )

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full">
        {cardInner}
      </Link>
    )
  }
  return cardInner
}
