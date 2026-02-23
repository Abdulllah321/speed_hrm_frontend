 'use client';
 import { useEffect, useState } from 'react';
 import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { toast } from 'sonner';
 import { ChartOfAccount, chartOfAccountApi, LandedCostChargeType, landedCostChargeTypeApi } from '@/lib/api';
 
 export default function LandedCostSetupPage() {
   const [name, setName] = useState('');
   const [accountId, setAccountId] = useState('');
   const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
   const [types, setTypes] = useState<LandedCostChargeType[]>([]);
   const [loading, setLoading] = useState(false);
 
   useEffect(() => {
     loadAccounts();
     loadTypes();
   }, []);
 
   const loadAccounts = async () => {
     const res = await chartOfAccountApi.getAll();
     setAccounts((res || []).filter(a => !a.isGroup));
   };
   const loadTypes = async () => {
     const res = await landedCostChargeTypeApi.getAll();
     setTypes((res?.data) || []);
   };
 
   const save = async () => {
     if (!name || !accountId) return;
     setLoading(true);
     const res = await landedCostChargeTypeApi.create({ name, accountId });
     if (res?.status && res.data?.id) {
       toast.success('Saved');
       setName('');
       setAccountId('');
       await loadTypes();
     } else {
       toast.error('Failed');
     }
     setLoading(false);
   };
 
   return (
     <div className="p-6 space-y-6">
       <Card>
         <CardHeader>
           <CardTitle>Landed Cost Setup</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-sm font-medium">Charge Name</label>
               <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Freight-in" className="mt-1" />
             </div>
             <div>
               <label className="text-sm font-medium">Account</label>
               <Select value={accountId} onValueChange={setAccountId}>
                 <SelectTrigger className="mt-1" isLoading={accounts.length === 0}>
                   <SelectValue placeholder="Select account" />
                 </SelectTrigger>
                 <SelectContent>
                   {accounts.map((a) => (
                     <SelectItem key={a.id} value={a.id} disabled={a.isGroup}>
                       {a.code} - {a.name} ({a.type})
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <div className="flex justify-end">
             <Button onClick={save} disabled={loading || !name || !accountId}>
               {loading ? 'Saving...' : 'Save'}
             </Button>
           </div>
         </CardContent>
       </Card>
 
       <Card>
         <CardHeader>
           <CardTitle>Saved Charge Types</CardTitle>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Name</TableHead>
                 <TableHead>Account</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {types.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={2} className="text-center h-24">No records</TableCell>
                 </TableRow>
               ) : (
                 types.map((t) => (
                   <TableRow key={t.id}>
                     <TableCell>{t.name}</TableCell>
                     <TableCell>{t.account ? `${t.account.code} - ${t.account.name}` : '—'}</TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 }
