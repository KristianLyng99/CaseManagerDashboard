import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, FileSpreadsheet, Calculator, Info, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Line } from "recharts";

export default function EnhancedData() {
  const { toast } = useToast();
  
  // Core data states
  const [excelLonnData, setExcelLonnData] = useState('');
  const [sykdato, setSykdato] = useState('');
  const [dsopRadata, setDsopRadata] = useState('');
  const [soknadRegistrert, setSoknadRegistrert] = useState('');
  const [aapFra, setAapFra] = useState('');
  
  // Calculation results states
  const [beregnetUforegrad, setBeregnetUforegrad] = useState<number | null>(null);
  const [antallMeldekort, setAntallMeldekort] = useState<number>(0);
  const [salaryIncreaseCheck, setSalaryIncreaseCheck] = useState<any>(null);
  const [gRegulatedCalculation, setGRegulatedCalculation] = useState<any>(null);
  
  // Toggle states
  const [visNominalLonn, setVisNominalLonn] = useState(false);
  const [foreldelseFiltreringAktiv, setForeldelseFiltreringAktiv] = useState(false);

  // Utility functions
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    // Try DD.MM.YYYY format first
    let parts = dateString.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Try DDMMYYYY format
    if (dateString.length === 8 && /^\d+$/.test(dateString)) {
      const day = parseInt(dateString.slice(0, 2), 10);
      const month = parseInt(dateString.slice(2, 4), 10) - 1;
      const year = parseInt(dateString.slice(4, 8), 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    return null;
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const parseExcelLonnData = (data: string) => {
    const lines = data.trim().split('\n');
    const salaryEntries = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by tabs (Excel paste format)
      const columns = line.split('\t');
      
      if (columns.length >= 5) {
        try {
          const gjelderfradato = columns[0];
          const lonnN = parseFloat(columns[1]) || 0;
          const stillingsprosent = parseFloat(columns[2]) || 0;
          const ajournalDato = columns[3];
          const lonn = parseFloat(columns[4]) || 0;
          
          const date = parseDate(gjelderfradato);
          if (date) {
            salaryEntries.push({
              gjelderfradato,
              date: date.toISOString(),
              lonnN,
              stillingsprosent,
              ajournalDato,
              lonn,
              salary100: stillingsprosent > 0 ? (lonn * 100) / stillingsprosent : 0
            });
          }
        } catch (e) {
          console.warn('Failed to parse line:', line, e);
        }
      }
    }
    
    return salaryEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleCalculate = () => {
    if (!excelLonnData || !sykdato) {
      toast({
        title: "Manglende data",
        description: "Vennligst fyll inn både Excel lønndata og sykdato.",
        variant: "destructive"
      });
      return;
    }

    try {
      const salaryData = parseExcelLonnData(excelLonnData);
      
      if (salaryData.length === 0) {
        toast({
          title: "Ingen lønndata funnet",
          description: "Kunne ikke parse Excel lønndata. Sjekk formatet.",
          variant: "destructive"
        });
        return;
      }

      // For now, just set basic results
      setSalaryIncreaseCheck({
        hasData: true,
        totalEntries: salaryData.length,
        sickDate: sykdato,
        salaryEntries: salaryData
      });

      toast({
        title: "Data prosessert",
        description: `${salaryData.length} lønnsposter er klar for analyse`,
      });

    } catch (error) {
      console.error('Error processing data:', error);
      toast({
        title: "Feil ved prosessering",
        description: "En feil oppstod under prosessering av data.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Forbedret Data Kalkulator</h1>
          <p className="text-slate-600 mt-2">
            Samme funksjonalitet som rådata kalkulator, men med Excel lønndata input
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Excel Format
        </Badge>
      </div>

      {/* Date Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Grunnleggende Informasjon
          </CardTitle>
          <CardDescription>
            Fyll inn datoer og grunnleggende informasjon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sykdato">Første sykedag</Label>
              <Input
                id="sykdato"
                type="text"
                placeholder="DD.MM.YYYY eller DDMMYYYY"
                value={sykdato}
                onChange={(e) => setSykdato(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="soknad-registrert">Søknad registrert</Label>
              <Input
                id="soknad-registrert"
                type="text"
                placeholder="DD.MM.YYYY eller DDMMYYYY"
                value={soknadRegistrert}
                onChange={(e) => setSoknadRegistrert(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aap-fra">AAP fra</Label>
              <Input
                id="aap-fra"
                type="text"
                placeholder="DD.MM.YYYY eller DDMMYYYY"
                value={aapFra}
                onChange={(e) => setAapFra(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleCalculate}
                disabled={!excelLonnData || !sykdato}
                className="w-full"
              >
                Beregn
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Excel Salary Data Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Lønndata
          </CardTitle>
          <CardDescription>
            Kopier og lim inn lønndata direkte fra Excel-tabell
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Format:</strong> Velg og kopier hele rader fra Excel inkludert kolonner som: 
              Gjelderfradato, LønnN, Stillingsprosent, AjournalDato, Lønn, etc.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="excel-lonn">Lim inn Excel data her:</Label>
            <Textarea
              id="excel-lonn"
              placeholder="01.12.2019 00:00     492366  1       06.01.2020      464702  1       ######  Normert Normert 29049   19634   38951   0       0       0       ..."
              value={excelLonnData}
              onChange={(e) => setExcelLonnData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          {salaryIncreaseCheck && (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="text-sm text-green-700">
                ✓ {salaryIncreaseCheck.totalEntries} lønnsposter er prosessert og klar for analyse
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DSOP Data Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            DSOP Rådata
          </CardTitle>
          <CardDescription>
            Lim inn meldekort data fra DSOP på samme måte som i hovedkalkulatoren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dsop-data">DSOP Meldekort Data:</Label>
            <Textarea
              id="dsop-data"
              placeholder="Periode      Utbetaling      Uføregrad       Sats..."
              value={dsopRadata}
              onChange={(e) => setDsopRadata(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Section - placeholder for now */}
      {salaryIncreaseCheck && (
        <Card>
          <CardHeader>
            <CardTitle>Beregningsresultater</CardTitle>
            <CardDescription>
              Resultater fra Excel lønndata analyse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Data Prosessert</h3>
              <p className="text-green-700">
                {salaryIncreaseCheck.totalEntries} lønnsposter er klar for videre analyse.
              </p>
              <p className="text-sm text-green-600 mt-2">
                Neste: Implementer samme beregningslogikk som rådata kalkulatoren.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}