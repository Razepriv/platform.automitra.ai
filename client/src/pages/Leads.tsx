import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/lib/useWebSocket";
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MoreHorizontal, 
  Sparkles, 
  Plus,
  ArrowUpDown,
  Bot
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";
import { LeadDialog } from "@/components/LeadDialog";

export default function Leads() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  // Real-time updates via WebSocket
  useWebSocketEvent('lead:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  useWebSocketEvent('lead:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  useWebSocketEvent('lead:deleted', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/auto-assign");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "AI Assignment Complete",
        description: data.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Deleted",
        description: "The lead has been permanently removed.",
      });
    },
  });

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedLead(undefined);
    setIsDialogOpen(true);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.phone?.includes(searchQuery)) ||
        (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const showingFrom = filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredLeads.length);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Bulk actions
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/leads/${id}`)));
      return ids.length;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedItems([]);
      toast({
        title: "Leads Deleted",
        description: `${deletedCount} lead${deletedCount !== 1 ? 's' : ''} have been permanently removed.`,
      });
    },
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Company", "Status", "Created"];
    const csv = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${lead.name}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone || ''}"`,
        `"${lead.company || ''}"`,
        `"${lead.status}"`,
        `"${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `${filteredLeads.length} leads exported to CSV`,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      qualified: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      lost: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return styles[status as keyof typeof styles] || styles.new;
  };

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage and track your incoming leads</p>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => autoAssignMutation.mutate()} 
                  disabled={autoAssignMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20"
                >
                  {autoAssignMutation.isPending ? (
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Auto Assign AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Automatically assign unassigned leads to available AI agents based on agent capabilities</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/50 dark:bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">All Leads</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-9 w-[250px] bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredLeads.length === 0}
              aria-label="Export leads to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedItems.length} lead{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${selectedItems.length} selected lead(s)? This action cannot be undone.`)) {
                      bulkDeleteMutation.mutate(selectedItems);
                    }
                  }}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length > 0 && selectedItems.length === filteredLeads.length}
                      onCheckedChange={(checked) => {
                        setSelectedItems(checked ? filteredLeads.map(l => l.id) : []);
                      }}
                      aria-label="Select all leads"
                    />
                  </TableHead>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24">
                      <SkeletonTable rows={3} columns={7} />
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 && leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 p-0">
                      <EmptyState
                        icon={Users}
                        title="No Leads Yet"
                        description="Import leads from CSV or create your first lead manually to get started"
                        action={
                          <Button onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Lead
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 p-0">
                      <EmptyState
                        icon={Search}
                        title="No leads found"
                        description={`No leads match your search "${searchQuery}"${statusFilter !== "all" ? ` and status "${statusFilter}"` : ""}`}
                        action={
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("all");
                            }}
                          >
                            Clear Filters
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="group"
                      onClick={(e) => {
                        // Don't trigger row click when clicking checkbox
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                          return;
                        }
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(lead.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, lead.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== lead.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select lead ${lead.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">{lead.company}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.assignedAgentId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">AI Agent</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(lead)}>Edit Lead</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(lead.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && filteredLeads.length > 0 && (
            <div className="border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredLeads.length}
                showingFrom={showingFrom}
                showingTo={showingTo}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <LeadDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        lead={selectedLead} 
      />
    </div>
  );
}
