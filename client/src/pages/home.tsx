import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Calendar, ChartLine, Clock, Copy, InfoIcon, WandSparkles, ClipboardType, Percent, ShieldCheck, Trash2, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [sykdato, setSykdato] = useState('');
  const [maksdato, setMaksdato] = useState('');
  const [aapFra, setAapFra] = useState('');
  const [aapTil, setAapTil] = useState('');
  const [uforetrygd, setUforetrygd] = useState('');
  const [lonnSykdato, setLonnSykdato] = useState('');
  const [rawSalaryData, setRawSalaryData] = useState('');
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
  const [uforegradPerioder, setUforegradPerioder] = useState<Array<{
    uforegrad: number;
    fraIndex: number;
    tilIndex: number;
    fraDato: string;
    tilDato: string;
  }> | null>(null);
  const [rawInput, setRawInput] = useState('');
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

  // Format user input DDMMYYYY -> DD.MM.YYYY
  const formatInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (/^\d{8}$/.test(digits)) {
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4);
      return `${d}.${m}.${y}`;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val;
    return val.replace(/\D/g, '');
  };

  // Parse and format helpers
  const parseDate = (str: string) => {
    const parts = str.split('.').map(Number);
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  };

  // Set AAP Fra/Til and update Maksdato
  const applyVedtakDates = (fraStr: string, tilStr: string) => {
    setAapFra(fraStr);
    setAapTil(tilStr);
    const fraDate = parseDate(fraStr);
    if (fraDate) {
      fraDate.setDate(fraDate.getDate() - 1);
      setMaksdato(formatDate(fraDate));
    }
  };

  // Parse raw clipboard data for autofill
  const parseAutofill = () => {
    const lines = rawInput.split(/\r?\n/);
    let vedtakFra: string | null = null;
    const tilDates: string[] = [];
    const meldekortData: Array<{
      hours: number;
      fraDato: string;
      tilDato: string;
    }> = [];

    const sykdatoMatch = rawInput.match(/Første sykedag:\s*(\d{2}\.\d{2}\.\d{4})/i);
    if (sykdatoMatch) setSykdato(sykdatoMatch[1]);
    
    const soknMatch = rawInput.match(/første melding om uførhet:\s*(\d{2}\.\d{2}\.\d{4})/i);
    if (soknMatch) setSoknadRegistrert(soknMatch[1]);

    let inVedtak = false;
    let inMeldekort = false;

    lines.forEach(line => {
      const t = line.trim();
      if (/^Vedtak ID/i.test(t)) { inVedtak = true; inMeldekort = false; return; }
      if (/^Meldekort ID/i.test(t)) { inMeldekort = true; inVedtak = false; return; }
      if (!t) return;
      
      if (inVedtak) {
        const m = t.match(/\d+\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/);
        if (m) {
          const [, fraStr, tilStr] = m;
          tilDates.push(tilStr);
          if (/Innvilgelse av søknad/i.test(t) && !vedtakFra) vedtakFra = fraStr;
        }
      }
      
      if (inMeldekort) {
        const m2 = t.match(/\d+\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+(\d+[\d,]*)/);
        if (m2) {
          const [, fraDato, tilDato, timerStr] = m2;
          meldekortData.push({
            hours: parseFloat(timerStr.replace(',', '.')),
            fraDato,
            tilDato
          });
        }
      }
    });

    if (vedtakFra && tilDates.length > 0) {
      applyVedtakDates(vedtakFra, tilDates[tilDates.length - 1]);
    }
    
    // Analyze meldekort data for disability grade changes
    if (meldekortData.length > 0) {
      analyzeUforegradChanges(meldekortData);
    }

    toast({
      title: "Autofyll fullført!",
      description: "Data er hentet fra rådata og fylt inn i feltene",
      duration: 3000,
    });
  };

  // Analyze disability grade changes across meldekort periods
  const analyzeUforegradChanges = (meldekortData: Array<{hours: number; fraDato: string; tilDato: string}>) => {
    if (meldekortData.length < 3) {
      // Not enough data to detect changes, just calculate average
      const totalHours = meldekortData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = totalHours / meldekortData.length;
      const workPct = (avgHours / 75) * 100;
      const uforegrad = Math.round((100 - workPct) / 5) * 5;
      setAvgUforegrad(uforegrad);
      setUforegradPerioder(null);
      return;
    }

    // Calculate uforegrad for each period
    const perioder = meldekortData.map((mk, index) => {
      const workPct = (mk.hours / 75) * 100;
      const uforegrad = Math.round((100 - workPct) / 5) * 5;
      return {
        uforegrad,
        hours: mk.hours,
        fraDato: mk.fraDato,
        tilDato: mk.tilDato,
        index
      };
    });

    // Detect significant changes (>15% over 3 periods)
    const significantPeriods: Array<{
      uforegrad: number;
      fraIndex: number;
      tilIndex: number;
      fraDato: string;
      tilDato: string;
    }> = [];

    let currentPeriodStart = 0;
    let currentUforegrad = perioder[0].uforegrad;

    for (let i = 1; i < perioder.length; i++) {
      const gradeDiff = Math.abs(perioder[i].uforegrad - currentUforegrad);
      
      // Check if there's a significant change (>15%)
      if (gradeDiff > 15) {
        // Add the previous period
        significantPeriods.push({
          uforegrad: currentUforegrad,
          fraIndex: currentPeriodStart,
          tilIndex: i - 1,
          fraDato: perioder[currentPeriodStart].fraDato,
          tilDato: perioder[i - 1].tilDato
        });
        
        // Start new period
        currentPeriodStart = i;
        currentUforegrad = perioder[i].uforegrad;
      }
    }

    // Add the final period
    significantPeriods.push({
      uforegrad: currentUforegrad,
      fraIndex: currentPeriodStart,
      tilIndex: perioder.length - 1,
      fraDato: perioder[currentPeriodStart].fraDato,
      tilDato: perioder[perioder.length - 1].tilDato
    });

    // Calculate overall average
    const totalHours = meldekortData.reduce((sum, mk) => sum + mk.hours, 0);
    const avgHours = totalHours / meldekortData.length;
    const overallUforegrad = Math.round(((100 - (avgHours / 75) * 100)) / 5) * 5;
    
    setAvgUforegrad(overallUforegrad);
    
    // Only set periods if there are actual changes detected
    if (significantPeriods.length > 1) {
      setUforegradPerioder(significantPeriods);
    } else {
      setUforegradPerioder(null);
    }
  };

  // Compute durations and theoretical sykdato
  useEffect(() => {
    const from = parseDate(sykdato);
    const to = parseDate(aapFra || uforetrygd);
    
    if (from && to) {
      let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
      let days = to.getDate() - from.getDate();
      
      if (days < 0) {
        months--; 
        days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
      }
      
      setDurationText(`${months} måneder og ${days} dager`);
      setDiffDays(months * 30 + days);
      
      const totalMonths = 18;
      const remMonths = totalMonths - months;
      const remDays = -days;
      const est = new Date(from);
      est.setMonth(est.getMonth() - remMonths);
      est.setDate(est.getDate() - remDays);
      setTeoretiskSykdato(formatDate(est));
    } else {
      setDurationText('');
      setDiffDays(null);
      setTeoretiskSykdato('');
    }
  }, [sykdato, aapFra, uforetrygd]);

  // Foreldelse: rød hvis mer enn 3 år mellom registrert og AAP Fra, ellers grønn
  const getForeldelseStatus = () => {
    const reg = parseDate(søknadRegistrert);
    const fra = parseDate(aapFra);
    if (reg && fra) {
      const diffMs = Math.abs(fra.getTime() - reg.getTime());
      const threeYearsMs = 365 * 24 * 60 * 60 * 1000 * 3;
      if (diffMs > threeYearsMs) {
        // Calculate date 3 years back from registration date
        const threeYearsBack = new Date(reg);
        threeYearsBack.setFullYear(threeYearsBack.getFullYear() - 3);
        const etterbetalingsDato = formatDate(threeYearsBack);
        
        return { 
          text: 'Foreldelse', 
          isValid: false, 
          etterbetalingFra: etterbetalingsDato
        };
      } else {
        return { 
          text: 'Ikke foreldelse', 
          isValid: true, 
          etterbetalingFra: null
        };
      }
    }
    return { text: '', isValid: true, etterbetalingFra: null };
  };

  const foreldelseStatus = getForeldelseStatus();

  // Parse salary history and check for 15% increase
  const parseSalaryHistory = () => {
    if (!rawSalaryData.trim() || !sykdato) return null;

    const lines = rawSalaryData.trim().split('\n');
    const salaryData = [];
    
    // Find the data sections
    let dateSection = false;
    let salarySection = false;
    let percentSection = false;
    let dates = [];
    let salaries = [];
    let percentages = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('Gjelder fra dato')) {
        dateSection = true;
        salarySection = false;
        percentSection = false;
        continue;
      } else if (line.includes('Lønn')) {
        dateSection = false;
        salarySection = true;
        percentSection = false;
        continue;
      } else if (line.includes('Stillingsprosent')) {
        dateSection = false;
        salarySection = false;
        percentSection = true;
        continue;
      }

      if (dateSection && line && !line.includes('Gjelder')) {
        dates.push(line);
      } else if (salarySection && line && !line.includes('Lønn')) {
        salaries.push(line);
      } else if (percentSection && line && !line.includes('Stillingsprosent')) {
        percentages.push(line);
      }
    }

    // Combine the data
    for (let i = 0; i < Math.min(dates.length, salaries.length, percentages.length); i++) {
      const dateStr = dates[i];
      const salaryStr = salaries[i].replace(/\s/g, '').replace(',', '.');
      const percentStr = percentages[i].replace(/\s/g, '').replace(',', '.');
      
      const salary = parseFloat(salaryStr);
      const percent = parseFloat(percentStr);
      
      if (!isNaN(salary) && salary > 0) {
        const parsedDate = parseDate(dateStr);
        if (parsedDate) {
          salaryData.push({
            date: parsedDate,
            salary: salary,
            percentage: percent || 100
          });
        }
      }
    }

    return salaryData.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  // Calculate Karens values based on salary from raw data
  const getKarensCalculations = () => {
    const salaryHistory = parseSalaryHistory();
    if (!salaryHistory || salaryHistory.length === 0 || !sykdato) {
      return { laveste2År: null, laveste1År: null };
    }

    const sickDate = parseDate(sykdato);
    if (!sickDate) return { laveste2År: null, laveste1År: null };

    // Find salary at sick date (most recent before or at sick date)
    const salaryAtSick = salaryHistory.find(entry => 
      entry.date <= sickDate
    );

    if (!salaryAtSick) {
      return { laveste2År: null, laveste1År: null };
    }
    
    const lonn = salaryAtSick.salary;
    const laveste2År = Math.round(lonn / 1.15);
    const laveste1År = Math.round(lonn / 1.075);
    
    return { laveste2År, laveste1År };
  };

  const karensCalculations = getKarensCalculations();

  // Check for 15% salary increase from 2 years before sick date
  const checkSalaryIncrease = () => {
    const salaryHistory = parseSalaryHistory();
    if (!salaryHistory || salaryHistory.length < 2 || !sykdato) {
      return null;
    }

    const sickDate = parseDate(sykdato);
    if (!sickDate) return null;

    const twoYearsBefore = new Date(sickDate);
    twoYearsBefore.setFullYear(twoYearsBefore.getFullYear() - 2);

    // Find salary at sick date (most recent before or at sick date)
    const salaryAtSick = salaryHistory.find(entry => 
      entry.date <= sickDate
    );

    // Find salary from 2 years before (most recent before or at 2 years before sick date)
    const salaryTwoYearsBefore = salaryHistory.find(entry => 
      entry.date <= twoYearsBefore
    );

    if (!salaryAtSick || !salaryTwoYearsBefore || salaryTwoYearsBefore.salary === 0) {
      return null;
    }

    const increasePercentage = ((salaryAtSick.salary - salaryTwoYearsBefore.salary) / salaryTwoYearsBefore.salary) * 100;
    const isHighIncrease = increasePercentage > 15;

    return {
      salaryAtSick: salaryAtSick.salary,
      salaryTwoYearsBefore: salaryTwoYearsBefore.salary,
      increasePercentage: Math.round(increasePercentage * 100) / 100,
      isHighIncrease,
      sickDate: formatDate(sickDate),
      twoYearsBeforeDate: formatDate(twoYearsBefore)
    };
  };

  const salaryIncreaseCheck = checkSalaryIncrease();

  // Clear all fields
  const handleClear = () => {
    setSykdato(''); 
    setMaksdato(''); 
    setAapFra(''); 
    setAapTil(''); 
    setUforetrygd('');
    setLonnSykdato('');
    setRawSalaryData('');
    setSoknadRegistrert(() => {
      const today = new Date();
      const firstOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const d = String(firstOfPreviousMonth.getDate()).padStart(2, '0');
      const m = String(firstOfPreviousMonth.getMonth() + 1).padStart(2, '0');
      const y = firstOfPreviousMonth.getFullYear();
      return `${d}.${m}.${y}`;
    }); 
    setDurationText(''); 
    setDiffDays(null); 
    setTeoretiskSykdato(''); 
    setAvgUforegrad(null);
    setUforegradPerioder(null);
    setRawInput('');
    
    toast({
      title: "Alle felt tømt",
      description: "Alle felter er nå tilbakestilt",
      duration: 2000,
    });
  };

  const dateFields = [
    { 
      id: 'sykdato',
      label: 'Første sykedag', 
      value: sykdato, 
      onChange: (v: string) => setSykdato(formatInput(v)),
      readonly: false
    },
    { 
      id: 'maksdato',
      label: 'Maksdato', 
      value: maksdato, 
      onChange: () => {}, // Read-only, updated automatically
      readonly: true,
      subtitle: '(Beregnet automatisk)'
    },
    { 
      id: 'aapFra',
      label: 'AAP fra dato', 
      value: aapFra, 
      onChange: (v: string) => applyVedtakDates(formatInput(v), aapTil),
      readonly: false
    },
    { 
      id: 'aapTil',
      label: 'AAP til dato', 
      value: aapTil, 
      onChange: (v: string) => setAapTil(formatInput(v)),
      readonly: false
    },
    { 
      id: 'soknadRegistrert',
      label: 'Søknad registrert', 
      value: søknadRegistrert, 
      onChange: (v: string) => setSoknadRegistrert(formatInput(v)),
      readonly: false
    },
    { 
      id: 'uforetrygd',
      label: 'Uføretrygd fra', 
      value: uforetrygd, 
      onChange: (v: string) => setUforetrygd(formatInput(v)),
      readonly: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="text-white text-lg h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Saksbehandler Verktøy</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Raw Data Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ClipboardType className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">Rådata Import</h2>
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
                Autofyll fra rådata
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Date Input Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="text-primary h-5 w-5" />
                <h2 className="text-lg font-medium text-slate-800">Datoer og Perioder</h2>
              </div>
              <Button 
                variant="outline"
                onClick={handleClear}
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Tøm alle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dateFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-sm font-medium text-slate-700">
                    {field.label}
                    {field.subtitle && (
                      <span className="text-slate-500 text-xs ml-1">{field.subtitle}</span>
                    )}
                    {!field.readonly && !field.subtitle && (
                      <span className="text-slate-500 text-xs ml-1">(DDMMYYYY)</span>
                    )}
                  </Label>
                  <div className="flex space-x-2">
                    <Input 
                      id={field.id}
                      type="text"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={field.readonly ? "" : "DDMMYYYY"}
                      className={field.readonly ? "bg-slate-50 text-slate-600" : ""}
                      readOnly={field.readonly}
                    />
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(field.value)}
                      disabled={!field.value}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Kopier til utklippstavle"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary Input Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Banknote className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">Lønn og Karens</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rawSalaryData" className="text-sm font-medium text-slate-700">
                  Rådata lønn
                  <span className="text-slate-500 text-xs ml-1">(lim inn data fra DSOP)</span>
                </Label>
                <Textarea
                  id="rawSalaryData"
                  value={rawSalaryData}
                  onChange={(e) => setRawSalaryData(e.target.value)}
                  placeholder="Lim inn rådata fra DSOP med kolonnene: Gjelder fra dato, Lønn, Stillingsprosent"
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <ChartLine className="text-primary h-5 w-5" />
              <h2 className="text-lg font-medium text-slate-800">Beregninger og Resultater</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Duration Calculation */}
              {durationText && (
                <div className={`p-4 rounded-lg border-l-4 ${
                  diffDays && diffDays >= 325 && diffDays <= 405 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Clock className={`mt-0.5 h-5 w-5 ${
                        diffDays && diffDays >= 325 && diffDays <= 405 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${
                        diffDays && diffDays >= 325 && diffDays <= 405 
                          ? 'text-green-800' 
                          : 'text-red-800'
                      }`}>
                        Syk til vedtak
                      </h3>
                      <p className={`text-lg font-semibold ${
                        diffDays && diffDays >= 325 && diffDays <= 405 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {durationText}
                      </p>
                      <p className={`text-xs mt-1 ${
                        diffDays && diffDays >= 325 && diffDays <= 405 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {diffDays && diffDays >= 325 && diffDays <= 405 
                          ? 'Innenfor normal periode (10.5-13.5 måneder)' 
                          : 'Utenfor normal periode'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Theoretical Sykdato */}
              {teoretiskSykdato && (
                <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Calculator className="text-blue-600 mt-0.5 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Teoretisk sykdato</h3>
                      <p className="text-lg font-semibold text-blue-700">
                        {teoretiskSykdato}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Basert på 18-måneders regel
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Average Disability Percentage */}
              {avgUforegrad !== null && (
                <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Percent className="text-amber-600 mt-0.5 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-amber-800">Gjennomsnittlig uføregrad</h3>
                      <p className="text-lg font-semibold text-amber-700">
                        {avgUforegrad}%
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Beregnet fra meldekort data
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Foreldelse Status */}
              {foreldelseStatus.text && (
                <div className={`p-4 rounded-lg border-l-4 ${
                  foreldelseStatus.isValid 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <ShieldCheck className={`mt-0.5 h-5 w-5 ${
                        foreldelseStatus.isValid ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${
                        foreldelseStatus.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Foreldelse vurdering
                      </h3>
                      <p className={`text-lg font-semibold ${
                        foreldelseStatus.isValid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {foreldelseStatus.text}
                      </p>
                      <p className={`text-xs mt-1 ${
                        foreldelseStatus.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Søknad registrert: {søknadRegistrert}
                      </p>
                      {!foreldelseStatus.isValid && foreldelseStatus.etterbetalingFra && (
                        <div className="mt-3 p-2 bg-red-100 rounded border border-red-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                Etterbetaling fra:
                              </p>
                              <p className="text-lg font-semibold text-red-700">
                                {foreldelseStatus.etterbetalingFra}
                              </p>
                              <p className="text-xs text-red-600 mt-1">
                                (3 år tilbake fra søknad registrert)
                              </p>
                            </div>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(foreldelseStatus.etterbetalingFra!)}
                              className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 border-red-300"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Kopier dato
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Karens Calculations */}
              {(karensCalculations.laveste2År || karensCalculations.laveste1År) && (
                <div className="md:col-span-2">
                  <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Banknote className="text-blue-600 mt-0.5 h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-blue-800 mb-3">
                          Karens vurdering lønn
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {karensCalculations.laveste2År && (
                            <div className="bg-white p-3 rounded border border-blue-200">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Laveste lønn 2 år før syk
                                </p>
                                <p className="text-lg font-semibold text-blue-700">
                                  {karensCalculations.laveste2År.toLocaleString('no-NO')} kr
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  (Basert på rådata ÷ 1,15)
                                </p>
                              </div>
                            </div>
                          )}
                          {karensCalculations.laveste1År && (
                            <div className="bg-white p-3 rounded border border-blue-200">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Laveste lønn 1 år før syk
                                </p>
                                <p className="text-lg font-semibold text-blue-700">
                                  {karensCalculations.laveste1År.toLocaleString('no-NO')} kr
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  (Basert på rådata ÷ 1,075)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary Increase Check */}
              {salaryIncreaseCheck && (
                <div className="md:col-span-2">
                  <div className={`p-4 rounded-lg border-l-4 ${
                    salaryIncreaseCheck.isHighIncrease 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {salaryIncreaseCheck.isHighIncrease ? (
                          <ShieldCheck className="text-red-600 mt-0.5 h-5 w-5" />
                        ) : (
                          <ShieldCheck className="text-green-600 mt-0.5 h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium mb-3 ${
                          salaryIncreaseCheck.isHighIncrease 
                            ? 'text-red-800' 
                            : 'text-green-800'
                        }`}>
                          {salaryIncreaseCheck.isHighIncrease 
                            ? 'Karens må vurderes' 
                            : 'Lønn OK'
                          }
                        </h3>
                        <div className="bg-white p-3 rounded border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-600">Lønn 2 år før syk ({salaryIncreaseCheck.twoYearsBeforeDate})</p>
                              <p className="font-semibold text-slate-800">
                                {salaryIncreaseCheck.salaryTwoYearsBefore.toLocaleString('no-NO')} kr
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600">Lønn ved syk dato ({salaryIncreaseCheck.sickDate})</p>
                              <p className="font-semibold text-slate-800">
                                {salaryIncreaseCheck.salaryAtSick.toLocaleString('no-NO')} kr
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600">Økning</p>
                              <p className={`font-semibold ${
                                salaryIncreaseCheck.isHighIncrease 
                                  ? 'text-red-700' 
                                  : 'text-green-700'
                              }`}>
                                {salaryIncreaseCheck.increasePercentage > 0 ? '+' : ''}{salaryIncreaseCheck.increasePercentage}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Uføregrad Periods - Show if multiple periods detected */}
            {uforegradPerioder && uforegradPerioder.length > 1 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-4">
                  <ChartLine className="text-orange-600 h-5 w-5" />
                  <h3 className="text-lg font-medium text-orange-800">
                    Endringer i uføregrad oppdaget
                  </h3>
                </div>
                <p className="text-sm text-orange-700 mb-4">
                  Systemet har oppdaget betydelige endringer (&gt;15%) i uføregraden over meldekortperiodene. 
                  Dette kan indikere behov for separate vedtak for ulike perioder.
                </p>
                <div className="space-y-3">
                  {uforegradPerioder.map((periode, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-orange-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            Periode {index + 1}: {periode.uforegrad}% uføregrad
                          </p>
                          <p className="text-xs text-slate-600">
                            Fra: {periode.fraDato} - Til: {periode.tilDato}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(`${periode.uforegrad}%`)}
                            className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 border-blue-200"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {periode.uforegrad}%
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(periode.fraDato)}
                            className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 border-green-200"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Fra: {periode.fraDato}
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(periode.tilDato)}
                            className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 border-green-200"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Til: {periode.tilDato}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-orange-100 rounded">
                  <p className="text-xs text-orange-800">
                    <strong>Anbefaling:</strong> Vurder om det er nødvendig med separate vedtak for hver periode med betydelig endring i arbeidskapasitet.
                  </p>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-800 mb-2">
                <InfoIcon className="inline text-slate-600 mr-2 h-4 w-4" />
                Veiledning
              </h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>Grønn</strong> indikerer verdier innenfor normale parametere</li>
                <li>• <strong>Rød</strong> indikerer verdier som krever oppmerksomhet</li>
                <li>• Datoer kan skrives som DDMMYYYY og formateres automatisk</li>
                <li>• Bruk "Autofyll" for å hente data direkte fra NAV-systemer</li>
                <li>• Alle datoer kan kopieres til utklippstavlen med kopier-knappen</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>


    </div>
  );
}
