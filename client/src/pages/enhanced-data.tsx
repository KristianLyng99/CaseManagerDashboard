import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Calendar, ChartLine, Clock, Copy, InfoIcon, WandSparkles, ClipboardType, Percent, ShieldCheck, Trash2, Banknote, Eye, AlertTriangle, BarChart3, FileSpreadsheet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useToast } from "@/hooks/use-toast";

export default function EnhancedData() {
  const [sykdato, setSykdato] = useState('');
  const [maksdato, setMaksdato] = useState('');
  const [aapFra, setAapFra] = useState('');
  const [aapTil, setAapTil] = useState('');
  const [uforetrygd, setUforetrygd] = useState('');
  const [lonnSykdato, setLonnSykdato] = useState('');
  const [excelSalaryData, setExcelSalaryData] = useState(''); // This replaces rawSalaryData
  const [søknadRegistrert, setSoknadRegistrert] = useState(() => {
    const today = new Date();
    const firstOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const d = String(firstOfPreviousMonth.getDate()).padStart(2, '0');
    const m = String(firstOfPreviousMonth.getMonth() + 1).padStart(2, '0');
    const y = firstOfPreviousMonth.getFullYear();
    return `${d}.${m}.${y}`;
  });
  const [durationText, setDurationText] = useState('');
  const [diffDays, setDiffDays] = useState<number | null>(null);
  const [teoretiskSykdato, setTeoretiskSykdato] = useState('');
  const [avgUforegrad, setAvgUforegrad] = useState<number | null>(null);
  const [avgUforegradExact, setAvgUforegradExact] = useState<number | null>(null);
  const [uforegradDateRange, setUforegradDateRange] = useState<{fraDato: string; tilDato: string} | null>(null);
  const [uforegradPerioder, setUforegradPerioder] = useState<Array<{
    uforegrad: number;
    fraIndex: number;
    tilIndex: number;
    fraDato: string;
    tilDato: string;
  }> | null>(null);
  const [meldekortWarnings, setMeldekortWarnings] = useState<Array<{
    type: 'gap' | 'low_uforegrad';
    message: string;
    detail: string;
  }>>([]);
  const [rawInput, setRawInput] = useState('');
  const [useNominalSalary, setUseNominalSalary] = useState(false);
  const [nominalSalaryData, setNominalSalaryData] = useState<{salary: number, salary100: number} | null>(null);
  const [debugTable, setDebugTable] = useState<{month: string, days: number, percentage: number, weighted: number}[] | null>(null);
  const { toast } = useToast();

  // Copy to clipboard utility
  const copyToClipboard = async (text: string) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopiert!",
        description: "Tekst er kopiert til utklippstavlen",
        duration: 2000,
      });
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      toast({
        title: "Kopiert!",
        description: "Tekst er kopiert til utklippstavlen",
        duration: 2000,
      });
    }
  };

  // PLACEHOLDER: Replace with parseAutofill from home.tsx that handles Excel format
  const parseAutofill = () => {
    toast({
      title: "Excel Parser",
      description: "Excel format parsing will be implemented here",
    });
  };

  const formatInput = (value: string) => {
    if (!value) return '';
    
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 8) {
      return `${cleaned.slice(0,2)}.${cleaned.slice(2,4)}.${cleaned.slice(4,8)}`;
    }
    
    return value;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="text-white text-lg h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Forbedret Data Kalkulator</h1>
              <p className="text-sm text-slate-600">Samme funksjonalitet som rådata kalkulator, men med Excel lønndata</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Raw Data Input - DSOP at the top like original */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ClipboardType className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">DSOP Rådata Import</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rawInput" className="text-sm font-medium text-slate-700 mb-2 block">
                  Lim inn data fra DSOP her. OBS ikke lim inn sensitiv data
                </Label>
                <Textarea 
                  id="rawInput"
                  rows={6}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="font-mono text-sm resize-none"
                  placeholder="Lim inn data fra DSOP her. OBS ikke lim inn sensitiv data"
                />
              </div>
              <Button 
                onClick={parseAutofill}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                Autofyl
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Excel Salary Data Input - This replaces the raw salary input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileSpreadsheet className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">Excel Lønndata</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="excelSalaryData" className="text-sm font-medium text-slate-700 mb-2 block">
                  Kopier og lim inn lønndata direkte fra Excel (tab-separerte verdier)
                </Label>
                <Textarea 
                  id="excelSalaryData"
                  rows={6}
                  value={excelSalaryData}
                  onChange={(e) => setExcelSalaryData(e.target.value)}
                  className="font-mono text-sm resize-none"
                  placeholder="Gjelderfradato	LønnN	Stillingsprosent	AjournalDato	Lønn	..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Fields - Same as original */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">Datoer</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sykdato" className="text-sm font-medium text-slate-700">
                  Første sykedag
                </Label>
                <Input
                  id="sykdato"
                  type="text"
                  value={sykdato}
                  onChange={(e) => setSykdato(formatInput(e.target.value))}
                  placeholder="DD.MM.YYYY"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="soknadRegistrert" className="text-sm font-medium text-slate-700">
                  Søknad registrert
                </Label>
                <Input
                  id="soknadRegistrert"
                  type="text"
                  value={søknadRegistrert}
                  onChange={(e) => setSoknadRegistrert(formatInput(e.target.value))}
                  placeholder="DD.MM.YYYY"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="aapFra" className="text-sm font-medium text-slate-700">
                  AAP fra dato
                </Label>
                <Input
                  id="aapFra"
                  type="text"
                  value={aapFra}
                  onChange={(e) => setAapFra(formatInput(e.target.value))}
                  placeholder="DD.MM.YYYY"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results will appear here when calculations are implemented */}
        {avgUforegrad !== null && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calculator className="text-primary h-5 w-5" />
                <h2 className="text-lg font-medium text-slate-800">Beregningsresultater</h2>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Beregnet uføregrad: {avgUforegrad}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}