"use client"

import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { Card, CardContent } from "@/app/(components)/ui/card"
import type { StatCardProps } from "@/app/projects/types/dashboard"

const StatCard = ({ title, value, icon, trend, className, onClick }: StatCardProps) => {
  return (
    <Card
      className={cn("transition-all duration-200 hover:shadow-md", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <h3 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</h3>
            {trend && (
              <div className="mt-1 flex items-center">
                {trend.isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-rose-500" />
                )}
                <span className={`ml-1 text-xs font-medium ${trend.isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                  {trend.value}%
                </span>
                <span className="ml-1 text-xs text-gray-500">vs mois précédent</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StatCard
