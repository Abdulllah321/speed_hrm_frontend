import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./button";

interface SmartPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function SmartPagination({ currentPage, totalPages, onPageChange }: SmartPaginationProps) {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        
        if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    return (
        <div className="flex gap-1 items-center">
            <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            {getVisiblePages().map((page, idx) => (
                page === '...' ? (
                    <div key={`ellipsis-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </div>
                ) : (
                    <Button
                        key={`page-${page}`}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        className={`h-8 w-8 text-xs font-bold transition-all ${currentPage === page ? "bg-primary text-primary-foreground scale-110 shadow-sm" : "hover:bg-muted"}`}
                        onClick={() => onPageChange(page as number)}
                    >
                        {page}
                    </Button>
                )
            ))}
            <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
                disabled={currentPage === totalPages}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
