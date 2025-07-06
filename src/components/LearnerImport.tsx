
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

// Fuzzy matching function with threshold
const fuzzyMatch = (str1: string, possibleMatches: string[], threshold = 0.8) => {
  // Convert to lowercase for case insensitive comparison
  const s1 = str1.toLowerCase();
  
  for (const match of possibleMatches) {
    const s2 = match.toLowerCase();
    
    // Exact match
    if (s1 === s2) return match;
    
    // Simple fuzzy match: calculate percentage of matching characters
    if (s1.includes(s2) || s2.includes(s1)) {
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      
      if (shorter.length / longer.length >= threshold) {
        return match;
      }
    }
    
    // Check for similar words (e.g. "name" and "full name")
    if (s2.includes(s1) || s1.split(' ').some(word => s2.includes(word))) {
      return match;
    }
  }
  
  return null;
};

interface LearnerData {
  name: string;
  email: string;
  phone: string;
}

interface ColumnMapping {
  name: string | null;
  email: string | null;
  phone: string | null;
}
interface LearnerImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}
const LearnerImport = ({ onSuccess, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: null,
    email: null,
    phone: null
  });
  const [mappingComplete, setMappingComplete] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          toast.error('No data found in the file');
          setIsLoading(false);
          return;
        }
        
        setParsedData(jsonData.slice(0, 100)); // Limit to first 100 rows for preview
        
        // Attempt to automatically map columns
        const sampleRow = jsonData[0];
        const columns = Object.keys(sampleRow);
        
        const nameOptions = ['name', 'full name', 'learner name', 'student name', 'user'];
        const emailOptions = ['email', 'email address', 'mail', 'e-mail'];
        const phoneOptions = ['phone', 'phone number', 'mobile', 'contact', 'whatsapp', 'cell'];
        
        const nameColumn = columns.find(col => fuzzyMatch(col, nameOptions)) || null;
        const emailColumn = columns.find(col => fuzzyMatch(col, emailOptions)) || null;
        const phoneColumn = columns.find(col => fuzzyMatch(col, phoneOptions)) || null;
        
        setColumnMapping({
          name: nameColumn,
          email: emailColumn,
          phone: phoneColumn
        });
        
        setMappingComplete(!!nameColumn && !!emailColumn && !!phoneColumn);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please make sure it\'s a valid CSV or Excel file');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsLoading(false);
    };
    
    reader.readAsBinaryString(file);
  };

  const handleColumnSelect = (field: keyof ColumnMapping, column: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: column }));
    
    // Check if all required fields are mapped
    const updatedMapping = { ...columnMapping, [field]: column };
    setMappingComplete(!!updatedMapping.name && !!updatedMapping.email && !!updatedMapping.phone);
  };

  const importLearners = async () => {
    if (!mappingComplete || parsedData.length === 0) return;
    
    setImporting(true);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const learners: LearnerData[] = parsedData.map(row => ({
        name: String(row[columnMapping.name!] || ''),
        email: String(row[columnMapping.email!] || ''),
        phone: String(row[columnMapping.phone!] || '')
      }));
      
      // Filter out invalid data
      const validLearners = learners.filter(learner => 
        learner.name && learner.email && learner.phone
      );
      
      // Insert in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < validLearners.length; i += batchSize) {
        const batch = validLearners.slice(i, i + batchSize);
        
        // Convert to format for insertion
        const learnersToInsert = batch.map(learner => ({
          name: learner.name,
          email: learner.email,
          phone: learner.phone,
          created_by: userData.user.id,
          status: 'active'
        }));
        
        const { data, error } = await supabase
          .from('learners')
          .insert(learnersToInsert)
          .select();
        
        if (error) {
          console.error('Error inserting batch:', error);
          failedCount += batch.length;
        } else {
          successCount += data.length;
          failedCount += (batch.length - data.length);
        }
      }
      
      // Send welcome messages to all successfully imported learners
      // This could be optimized to be part of the import process
      
      toast.success(`Successfully imported ${successCount} learners`);
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} learners`);
      }
      
      setImportResults({
        success: successCount,
        failed: failedCount,
        total: validLearners.length
      });
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('An error occurred during import');
    } finally {
      setImporting(false);
    }
  };
  
  const resetImport = () => {
    setParsedData([]);
    setColumnMapping({ name: null, email: null, phone: null });
    setMappingComplete(false);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Learners</CardTitle>
        <CardDescription>
          Import learners from CSV or Excel file. 
          The file should contain name, email, and phone number columns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!parsedData.length ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="mb-4 text-sm text-muted-foreground text-center">
              Upload a CSV or Excel file with learner data
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : 'Select File'}
            </Button>
          </div>
        ) : importResults ? (
          <div className="space-y-4">
            <Alert variant={importResults.failed > 0 ? "destructive" : "default"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import Completed</AlertTitle>
              <AlertDescription>
                Successfully imported {importResults.success} out of {importResults.total} learners.
                {importResults.failed > 0 && ` Failed to import ${importResults.failed} learners.`}
              </AlertDescription>
            </Alert>
            
            <Button onClick={resetImport}>Import Another File</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Column Mapping</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please confirm the mapping of columns from your file to learner fields.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {['name', 'email', 'phone'].map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium capitalize">{field}</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={columnMapping[field as keyof ColumnMapping] || ''}
                      onChange={(e) => handleColumnSelect(field as keyof ColumnMapping, e.target.value)}
                    >
                      <option value="">Select column</option>
                      {parsedData.length > 0 && 
                        Object.keys(parsedData[0]).map(column => (
                          <option key={column} value={column}>{column}</option>
                        ))
                      }
                    </select>
                  </div>
                ))}
              </div>
              
              {!mappingComplete && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Incomplete Mapping</AlertTitle>
                  <AlertDescription>
                    Please map all required fields (name, email, phone) to proceed with the import.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Data Preview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Showing first {Math.min(parsedData.length, 5)} of {parsedData.length} rows.
              </p>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {columnMapping.name && <TableHead>Name</TableHead>}
                      {columnMapping.email && <TableHead>Email</TableHead>}
                      {columnMapping.phone && <TableHead>Phone</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        {columnMapping.name && <TableCell>{row[columnMapping.name]}</TableCell>}
                        {columnMapping.email && <TableCell>{row[columnMapping.email]}</TableCell>}
                        {columnMapping.phone && <TableCell>{row[columnMapping.phone]}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetImport}
          disabled={importing || !parsedData.length}
        >
          Cancel
        </Button>
        
        {parsedData.length > 0 && !importResults && (
          <Button 
            onClick={importLearners} 
            disabled={!mappingComplete || importing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${parsedData.length} Learners`
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default LearnerImport;
