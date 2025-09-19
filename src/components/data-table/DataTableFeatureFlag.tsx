"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

interface DataTableFeatureFlagProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export function DataTableFeatureFlag({ enabled, onToggle }: DataTableFeatureFlagProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white border rounded-lg shadow-lg transition-all duration-200 ${
        isExpanded ? 'p-4 min-w-80' : 'p-2'
      }`}>
        {!isExpanded ? (
          <Button
            onClick={() => setIsExpanded(true)}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Configurações de Desenvolvimento</h3>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                ×
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Novo Data Table
                </label>
                <p className="text-xs text-gray-500">
                  Usar o novo Data Table do Shadcn
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onToggle(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  } mt-0.5 ml-0.5`} />
                </div>
              </label>
            </div>

            <div className="text-xs text-gray-400 pt-2 border-t">
              Esta configuração é apenas para desenvolvimento e será removida na versão final.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}