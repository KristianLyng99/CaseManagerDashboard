import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Calendar, ChartLine, Clock, Copy, InfoIcon, WandSparkles, ClipboardType, Percent, ShieldCheck, Trash2, Banknote, Eye, AlertTriangle, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
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

  // Calculate nominal salary (average of last 12 months)
  const handleUseNominalSalary = () => {
    console.log('=== NOMINAL SALARY BUTTON CLICKED ===');
    const salaryHistory = parseSalaryHistory();
    const sickDate = parseDate(sykdato);
    console.log('Parsed salary history length:', salaryHistory ? salaryHistory.length : 'null');
    console.log('Sick date:', sickDate);
    
    if (!salaryHistory || !sickDate) {
      toast({
        title: "Feil",
        description: "Mangler lønnsdata eller sykdato",
        variant: "destructive",
      });
      return;
    }

    // Create 12 months of salary data starting from sick month going backwards
    // Fill missing months with the most recent salary data (forward-fill logic)
    const sickMonth = sickDate.getMonth(); // 0-based month
    const sickYear = sickDate.getFullYear();
    
    // Sort salary history by date (oldest first) for forward-fill logic
    const sortedSalaries = salaryHistory
      .filter((entry: any) => entry.salary > 0)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    
    const nominalSalaries = [];
    
    // Generate 12 months starting from sick month going backwards
    for (let i = 0; i < 12; i++) {
      let targetMonth = sickMonth - i;
      let targetYear = sickYear;
      
      // Handle month overflow
      if (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      
      const targetDate = new Date(targetYear, targetMonth, 1);
      console.log(`Looking for salary for ${targetDate.toISOString().substring(0, 7)}`);
      
      // Find the most recent salary entry on or before this target date
      let applicableSalary = null;
      for (let j = sortedSalaries.length - 1; j >= 0; j--) {
        if (sortedSalaries[j].date <= targetDate) {
          applicableSalary = {
            date: targetDate,
            salary: sortedSalaries[j].salary,
            percentage: sortedSalaries[j].percentage,
            originalDate: sortedSalaries[j].date
          };
          break;
        }
      }
      
      if (applicableSalary) {
        console.log(`  Using salary from ${applicableSalary.originalDate.toISOString().substring(0, 10)}: ${applicableSalary.salary} kr`);
        nominalSalaries.push(applicableSalary);
      }
    }
    
    console.log(`Sick date: ${sickDate.toISOString().substring(0, 10)}`);
    console.log('Generated 12 months of salary data:', nominalSalaries.map(s => ({
      month: s.date.toISOString().substring(0, 7),
      salary: s.salary,
      percentage: s.percentage,
      originalFrom: s.originalDate.toISOString().substring(0, 10)
    })));

    if (nominalSalaries.length === 0) {
      toast({
        title: "Feil",
        description: "Ingen lønnsdata funnet før sykdato",
        variant: "destructive",
      });
      return;
    }

    const last12MonthsSalaries = nominalSalaries;

    // Calculate day-weighted average salary
    let totalWeightedSalary = 0;
    let totalWeightedPercentage = 0;
    let totalDays = 0;
    
    for (const entry of last12MonthsSalaries) {
      // Get number of days in the month for this entry
      const year = entry.date.getFullYear();
      const month = entry.date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      totalWeightedSalary += entry.salary * daysInMonth;
      totalWeightedPercentage += entry.percentage * daysInMonth;
      totalDays += daysInMonth;
      
      console.log(`  Month ${month + 1}/${year}: ${daysInMonth} days, salary ${entry.salary} kr`);
    }
    
    const avgSalary = totalWeightedSalary / totalDays;
    const avgPercentage = totalWeightedPercentage / totalDays;
    
    console.log(`Day-weighted average: ${Math.round(avgSalary)} kr over ${totalDays} total days`);
    
    // Calculate nominal position percentage using same forward-fill and day-weighted logic
    let totalWeightedNominalPercentage = 0;
    let totalNominalDays = 0;
    
    console.log('=== NOMINAL POSITION PERCENTAGE CALCULATION ===');
    
    const debugData: {month: string, days: number, percentage: number, weighted: number}[] = [];
    
    // Generate nominal position percentages for the same 12 months as salary calculation
    // Use the same months that were used for salary calculation
    for (const salaryEntry of last12MonthsSalaries) {
      const year = salaryEntry.date.getFullYear();
      const month = salaryEntry.date.getMonth();
      const targetDate = new Date(year, month + 1, 0); // Last day of the month
      
      // Find the most recent position percentage entry on or before this target date
      let applicablePercentage = null;
      let foundEntry = null;
      for (let j = sortedSalaries.length - 1; j >= 0; j--) {
        if (sortedSalaries[j].date <= targetDate) {
          applicablePercentage = sortedSalaries[j].percentage;
          foundEntry = sortedSalaries[j];
          break;
        }
      }
      
      if (applicablePercentage !== null) {
        // Get number of days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const weighted = applicablePercentage * daysInMonth;
        totalWeightedNominalPercentage += weighted;
        totalNominalDays += daysInMonth;
        
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        debugData.push({
          month: monthStr,
          days: daysInMonth,
          percentage: applicablePercentage,
          weighted: weighted
        });
        
        console.log(`${monthStr}: ${daysInMonth} days, ${applicablePercentage}%, weighted: ${weighted.toFixed(2)}`);
      }
    }
    
    // Set debug table for UI display
    setDebugTable(debugData);
    
    console.log(`Total weighted: ${totalWeightedNominalPercentage.toFixed(2)}`);
    console.log(`Total days: ${totalNominalDays}`);
    console.log(`Average: ${(totalWeightedNominalPercentage / totalNominalDays).toFixed(2)}%`);
    
    const avgNominalPercentage = totalWeightedNominalPercentage / totalNominalDays;
    console.log(`=== FINAL NOMINAL POSITION AVERAGE: ${avgNominalPercentage.toFixed(2)}% ===`);
    
    // Calculate full-time equivalent using nominal percentage
    const avgSalary100 = avgSalary / (avgNominalPercentage / 100);

    if (!useNominalSalary) {
      // Switch to nominal salary
      setNominalSalaryData({
        salary: Math.round(avgSalary),
        salary100: Math.round(avgSalary100)
      });
      
      setUseNominalSalary(true);
      
      toast({
        title: "Nomert lønn aktivert",
        description: `Dagsveid gjennomsnitt 12 måneder: ${Math.round(avgSalary).toLocaleString('no-NO')} kr (${avgNominalPercentage.toFixed(1)}%) → 100%: ${Math.round(avgSalary100).toLocaleString('no-NO')} kr`,
      });
    } else {
      // Switch back to actual salary
      setUseNominalSalary(false);
      setNominalSalaryData(null);
      
      toast({
        title: "Faktisk lønn aktivert",
        description: "Bruker nå opprinnelig lønn fra sykdato",
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

    // Check for the new structured format
    const hasStructuredFormat = rawInput.includes('AAP') && rawInput.includes('Uttrekksperiode:');
    
    // Parse sick date
    const sykdatoMatch = rawInput.match(/Første sykedag:\s*(\d{2}\.\d{2}\.\d{4})/i);
    if (sykdatoMatch) setSykdato(sykdatoMatch[1]);
    
    const soknMatch = rawInput.match(/første melding om uførhet:\s*(\d{2}\.\d{2}\.\d{4})/i);
    if (soknMatch) setSoknadRegistrert(soknMatch[1]);

    // Parse new structured format for AAP and Uføretrygd
    if (hasStructuredFormat) {
      // First try to find actual AAP vedtak with "Innvilgelse av søknad"
      let aapFound = false;
      const aapDatesFromVedtak: string[] = [];
      
      const vedtakSection = rawInput.indexOf('Vedtak ID');
      if (vedtakSection !== -1) {
        const vedtakLines = rawInput.substring(vedtakSection).split('\n');
        for (const line of vedtakLines) {
          // Look for lines containing AAP-related keywords
          if (line.includes('Arbeidsavklaringspenger') || line.includes('§11-5 nedsatt arbeidsevne')) {
            const vedtakMatch = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/);
            if (vedtakMatch) {
              const [, fraStr, tilStr] = vedtakMatch;
              aapDatesFromVedtak.push(fraStr);
              tilDates.push(tilStr);
              aapFound = true;
            }
          }
        }
        
        // Use the second date as AAP FRA if we have multiple AAP dates
        if (aapDatesFromVedtak.length >= 2) {
          applyVedtakDates(aapDatesFromVedtak[1], tilDates[tilDates.length - 1]);
          vedtakFra = aapDatesFromVedtak[1];
        } else if (aapDatesFromVedtak.length === 1) {
          applyVedtakDates(aapDatesFromVedtak[0], tilDates[tilDates.length - 1]);
          vedtakFra = aapDatesFromVedtak[0];
        }
      }
      
      // Fallback to Uttrekksperiode if no "Innvilgelse av søknad" found
      if (!aapFound) {
        const aapPeriodMatch = rawInput.match(/Uttrekksperiode:\s*(\d{2}\.\d{2}\.\d{4})\s+til\s+(\d{2}\.\d{2}\.\d{4})/);
        if (aapPeriodMatch) {
          const [, fraStr, tilStr] = aapPeriodMatch;
          applyVedtakDates(fraStr, tilStr);
          vedtakFra = fraStr;
          tilDates.push(tilStr);
        }
      }

      // Parse Uføretrygd data
      const uforeSection = rawInput.indexOf('Uføretrygd');
      if (uforeSection !== -1) {
        const uforeSectionText = rawInput.substring(uforeSection);
        
        // Look for "Første virkningstidspunkt" first
        const virkningMatch = uforeSectionText.match(/Første virkningstidspunkt:\s*(\d{2}\.\d{2}\.\d{4})/);
        if (virkningMatch) {
          setUforetrygd(virkningMatch[1]);
        } else {
          // Fallback to parsing data rows
          const uforeLines = uforeSectionText.split('\n');
          for (const line of uforeLines) {
            const trimmed = line.trim();
            // Skip empty lines and headers
            if (!trimmed || trimmed.includes('ferdiglignetInntekt') || trimmed.includes('fom')) continue;
            
            // Parse structured uføretrygd data: " 01.04.2013 331300  False 31.12.2014 50 01.12.2009"
            // Split by whitespace and find date patterns
            const parts = trimmed.split(/\s+/);
            const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
            const firstDate = parts.find(part => datePattern.test(part));
            
            if (firstDate) {
              setUforetrygd(firstDate);
              break; // Take the first valid date
            }
          }
        }
      }
    }

    let inVedtak = false;
    let inMeldekort = false;
    const aapDatesFromOldFormat: string[] = [];

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
          // Look for AAP-related keywords
          if (t.includes('Arbeidsavklaringspenger') || t.includes('§11-5 nedsatt arbeidsevne') || /Innvilgelse av søknad/i.test(t)) {
            aapDatesFromOldFormat.push(fraStr);
          }
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

    // Extract the dates we need for foreldelse calculation BEFORE applying them to state
    // ALWAYS use the actual registration date from the form, not the parsed til date
    let calculatedSøknadRegistrert = søknadRegistrert;
    let calculatedAapFra = '';
    
    // For old format parsing, determine AAP start date but keep original registration date
    if (aapDatesFromOldFormat.length >= 2 && tilDates.length > 0) {
      calculatedAapFra = aapDatesFromOldFormat[1];
      applyVedtakDates(aapDatesFromOldFormat[1], tilDates[tilDates.length - 1]);
    } else if (aapDatesFromOldFormat.length === 1 && tilDates.length > 0) {
      calculatedAapFra = aapDatesFromOldFormat[0];
      applyVedtakDates(aapDatesFromOldFormat[0], tilDates[tilDates.length - 1]);
    }
    
    // Analyze meldekort data for disability grade changes  
    console.log('About to process meldekort data:', meldekortData.length, 'meldekort found');
    if (meldekortData.length > 0) {
      console.log('CALLING analyzeUforegradChanges with', meldekortData.length, 'meldekort');
      
      // IMMEDIATELY check foreldelse using the freshly calculated dates
      let filteredMeldekort = meldekortData;
      
      console.error('FORELDELSE CHECK WITH FRESH DATES:', {
        calculatedSøknadRegistrert,
        calculatedAapFra
      });
      
      if (calculatedSøknadRegistrert && calculatedAapFra) {
        const regDate = parseDate(calculatedSøknadRegistrert);
        const fraDate = parseDate(calculatedAapFra);
        
        if (regDate && fraDate) {
          const diffMs = regDate.getTime() - fraDate.getTime();
          const threeYearsMs = 3 * 365.25 * 24 * 60 * 60 * 1000;
          
          console.error('FORELDELSE CALCULATION:', {
            diffMs,
            threeYearsMs,
            hasForeldelse: diffMs > threeYearsMs
          });
          
          if (diffMs > threeYearsMs) {
            const etterbetalingFra = new Date(regDate.getTime() - threeYearsMs);
            console.error('FORELDELSE FILTERING WILL BE APPLIED - etterbetalingFra:', etterbetalingFra.toISOString().split('T')[0]);
            
            // Find which meldekort contains the foreldelse date
            let targetIndex = -1;
            for (let i = 0; i < meldekortData.length; i++) {
              const startDate = parseDate(meldekortData[i].fraDato);
              const endDate = parseDate(meldekortData[i].tilDato);
              if (startDate && endDate && etterbetalingFra >= startDate && etterbetalingFra <= endDate) {
                targetIndex = i;
                console.error('Found foreldelse in meldekort', i + 1, 'period:', meldekortData[i].fraDato, '-', meldekortData[i].tilDato);
                break;
              }
            }
            
            if (targetIndex !== -1) {
              const startIndex = Math.max(0, targetIndex - 2);
              filteredMeldekort = meldekortData.slice(startIndex);
              console.error('FILTERED TO', filteredMeldekort.length, 'meldekort starting from index', startIndex);
              
              toast({
                title: "Foreldelse detektert",
                description: `Uføregrad beregnes fra meldekort #${startIndex + 1} (${meldekortData.length - filteredMeldekort.length} meldekort ekskludert)`,
                duration: 4000,
              });
            }
          }
        }
      }
      
      // Call analysis function immediately with filtered data
      analyzeUforegradChangesSimplified(filteredMeldekort);
      console.log('analyzeUforegradChangesSimplified call completed');
        
      // Show completion toast after analysis is done
      toast({
        title: "Autofyll fullført!",
        description: "Data er hentet fra rådata og fylt inn i feltene",
        duration: 3000,
      });
    } else {
      console.log('NO MELDEKORT DATA TO ANALYZE');
      
      // Show completion toast immediately if no meldekort data
      toast({
        title: "Autofyll fullført!",
        description: "Data er hentet fra rådata og fylt inn i feltene",
        duration: 3000,
      });
    }
  };

  // Simplified analysis function that only calculates without any filtering
  const analyzeUforegradChangesSimplified = (meldekortData: Array<{hours: number; fraDato: string; tilDato: string}>) => {
    console.error('*** SIMPLIFIED FUNCTION STARTED - USING PRE-FILTERED DATA ***');
    console.error('Received meldekort count:', meldekortData.length);
    
    if (meldekortData.length < 3) {
      // Not enough data to detect changes, just calculate average
      const totalHours = meldekortData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = meldekortData.length > 0 ? totalHours / meldekortData.length : 0;
      const workPct = (avgHours / 75) * 100;
      const uforegradExact = 100 - workPct;
      const uforegrad = Math.round(uforegradExact / 5) * 5;
      
      console.error('SIMPLE AVERAGE CALCULATION:', { avgHours, uforegrad });
      setAvgUforegrad(uforegrad);
      setAvgUforegradExact(uforegradExact);
      setUforegradDateRange(meldekortData.length > 0 ? {
        fraDato: meldekortData[0].fraDato,
        tilDato: meldekortData[meldekortData.length - 1].tilDato
      } : null);
      setUforegradPerioder(null);
      return;
    }

    // Skip first meldekort (start from kort #2)
    const analyseData = meldekortData.slice(1);
    
    if (analyseData.length < 2) {
      // Not enough data after skipping first
      const totalHours = analyseData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = analyseData.length > 0 ? totalHours / analyseData.length : 0;
      const workPct = (avgHours / 75) * 100;
      const uforegradExact = 100 - workPct;
      const uforegrad = Math.round(uforegradExact / 5) * 5;
      
      console.error('SIMPLE CALCULATION AFTER SLICE:', { avgHours, uforegrad });
      setAvgUforegrad(uforegrad);
      setAvgUforegradExact(uforegradExact);
      setUforegradDateRange(analyseData.length > 0 ? {
        fraDato: analyseData[0].fraDato,
        tilDato: analyseData[analyseData.length - 1].tilDato
      } : null);
      setUforegradPerioder(null);
      return;
    }

    // Continue with full analysis...
    // Calculate overall average from all analyzed data
    const totalHours = analyseData.reduce((sum, mk) => sum + mk.hours, 0);
    const avgHours = totalHours / analyseData.length;
    const overallUforegradExact = 100 - (avgHours / 75) * 100;
    const overallUforegrad = Math.round(overallUforegradExact / 5) * 5;
    
    console.error('FINAL SIMPLIFIED CALCULATION:', {
      analyseDataCount: analyseData.length,
      avgHours: avgHours,
      overallUforegrad: overallUforegrad
    });
    
    setAvgUforegrad(overallUforegrad);
    setAvgUforegradExact(overallUforegradExact);
    setUforegradDateRange({
      fraDato: analyseData[0].fraDato,
      tilDato: analyseData[analyseData.length - 1].tilDato
    });
    setUforegradPerioder(null);
  };

  // Analyze disability grade changes across meldekort periods using sophisticated algorithm
  const analyzeUforegradChangesFixed = (meldekortData: Array<{hours: number; fraDato: string; tilDato: string}>) => {
    const callId = Math.random().toString(36).substr(2, 9);
    try {
      console.error(`*** ANALYZE UFOREGRAD CHANGES FUNCTION STARTED [${callId}] ***`);
      console.error(`analyzeUforegradChanges called with [${callId}]:`, {
        meldekortCount: meldekortData.length,
        firstMeldekort: meldekortData[0],
        lastMeldekort: meldekortData[meldekortData.length - 1]
      });
    
    // In normal cases, use ALL meldekort data
    // Only apply foreldelse filtering when foreldelse is actually detected
    let filteredMeldekortData = meldekortData;
    const foreldelseStatus = getForeldelseStatus();
    
    console.error(`[${callId}] Foreldelse status in analyze function:`, foreldelseStatus);
    
    console.error('Foreldelse status in analyze function:', foreldelseStatus);
    
    // Only filter if foreldelse is detected
    if (foreldelseStatus.etterbetalingFra) {
      const foreldelseDato = parseDate(foreldelseStatus.etterbetalingFra);
      if (foreldelseDato) {
        console.error('FORELDELSE FILTERING WILL BE APPLIED:', {
          etterbetalingFra: foreldelseStatus.etterbetalingFra,
          foreldelseDato: foreldelseDato,
          totalMeldekort: meldekortData.length
        });
        console.log('Foreldelse detected:', {
          etterbetalingFra: foreldelseStatus.etterbetalingFra,
          foreldelseDato: foreldelseDato,
          totalMeldekort: meldekortData.length,
          foreldelseStatus: foreldelseStatus
        });

        // Find the meldekort that contains the "etterbetaling fra" date
        console.log('Searching for meldekort containing foreldelse date:', foreldelseDato);
        const targetMeldekortIndex = meldekortData.findIndex((mk, index) => {
          const mkStartDate = parseDate(mk.fraDato);
          const mkEndDate = parseDate(mk.tilDato);
          const contains = mkStartDate && mkEndDate && 
                 mkStartDate <= foreldelseDato && 
                 foreldelseDato <= mkEndDate;
          
          if (index < 5 || contains) { // Log first 5 and any matches
            console.log(`Meldekort ${index}:`, {
              fraDato: mk.fraDato,
              tilDato: mk.tilDato,
              startDate: mkStartDate,
              endDate: mkEndDate,
              contains: contains
            });
          }
          
          return contains;
        });
        
        console.log('Target meldekort index:', targetMeldekortIndex);
        
        // If we found the target meldekort, include TWO before it (if they exist)
        // This properly compensates for the algorithm skipping the first meldekort in analysis
        let startIndex = 0;
        if (targetMeldekortIndex > 1) {
          startIndex = targetMeldekortIndex - 2;
        } else if (targetMeldekortIndex === 1) {
          startIndex = 0;
        } else if (targetMeldekortIndex === 0) {
          startIndex = 0;
        } else {
          // If no meldekort contains the foreldelse date, filter by date as before
          console.log('No meldekort contains foreldelse date, filtering by date');
          filteredMeldekortData = meldekortData.filter(mk => {
            const mkStartDate = parseDate(mk.fraDato);
            return mkStartDate && mkStartDate >= foreldelseDato;
          });
        }
        
        // Apply the filtering if we found a specific index
        if (targetMeldekortIndex >= 0) {
          console.log('Applying index-based filtering, startIndex:', startIndex);
          console.log('Original meldekort count:', meldekortData.length);
          filteredMeldekortData = meldekortData.slice(startIndex);
          console.log('Filtered meldekort count:', filteredMeldekortData.length);
          console.log('First few filtered meldekort:', filteredMeldekortData.slice(0, 3).map(mk => ({
            fraDato: mk.fraDato,
            tilDato: mk.tilDato,
            hours: mk.hours
          })));
        }
        
        console.log('After filtering:', {
          originalLength: meldekortData.length,
          filteredLength: filteredMeldekortData.length,
          excluded: meldekortData.length - filteredMeldekortData.length
        });
        
        // Show toast to inform user about filtered data
        if (filteredMeldekortData.length < meldekortData.length) {
          const excludedCount = meldekortData.length - filteredMeldekortData.length;
          const startFromKort = startIndex + 1; // Convert to 1-based numbering
          toast({
            title: "Foreldelse detektert",
            description: `Uføregrad beregnes fra meldekort #${startFromKort} (${excludedCount} meldekort ekskludert)`,
            duration: 4000,
          });
        }
      }
    } else {
      console.error('NO FORELDELSE FILTERING APPLIED - etterbetalingFra is null or empty');
    }
    
    if (filteredMeldekortData.length < 3) {
      // Not enough data to detect changes, just calculate average
      console.error('EARLY EXIT CALCULATION - filteredMeldekortData.length < 3:', {
        filteredLength: filteredMeldekortData.length,
        firstMeldekort: filteredMeldekortData[0],
        lastMeldekort: filteredMeldekortData[filteredMeldekortData.length - 1]
      });
      const totalHours = filteredMeldekortData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = filteredMeldekortData.length > 0 ? totalHours / filteredMeldekortData.length : 0;
      const workPct = (avgHours / 75) * 100;
      const uforegradExact = 100 - workPct;
      const uforegrad = Math.round(uforegradExact / 5) * 5;
      console.error('EARLY EXIT SETTING:', { avgHours, uforegrad });
      setAvgUforegrad(uforegrad);
      setAvgUforegradExact(uforegradExact);
      setUforegradDateRange(filteredMeldekortData.length > 0 ? {
        fraDato: filteredMeldekortData[0].fraDato,
        tilDato: filteredMeldekortData[filteredMeldekortData.length - 1].tilDato
      } : null);
      setUforegradPerioder(null);
      return;
    }

    // Step 0: Skip first meldekort (start from kort #2)
    const analyseData = filteredMeldekortData.slice(1);
    
    if (analyseData.length < 2) {
      // Not enough data after skipping first
      const totalHours = analyseData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = analyseData.length > 0 ? totalHours / analyseData.length : 0;
      const workPct = (avgHours / 75) * 100;
      const uforegradExact = 100 - workPct;
      const uforegrad = Math.round(uforegradExact / 5) * 5;
      setAvgUforegrad(uforegrad);
      setAvgUforegradExact(uforegradExact);
      setUforegradDateRange(analyseData.length > 0 ? {
        fraDato: analyseData[0].fraDato,
        tilDato: analyseData[analyseData.length - 1].tilDato
      } : null);
      setUforegradPerioder(null);
      return;
    }

    // Step 1: Convert timer to work percentage (prosent[i] = timer[i] / 75)
    const prosent = analyseData.map(mk => mk.hours / 75);
    
    // Step 2: Smooth signal with window k=2 (5-point window)
    const k = 2;
    const glatt = prosent.map((_, i) => {
      const start = Math.max(0, i - k);
      const end = Math.min(prosent.length - 1, i + k);
      let sum = 0;
      let count = 0;
      for (let j = start; j <= end; j++) {
        sum += prosent[j];
        count++;
      }
      return sum / count;
    });
    
    // Step 3: Find changes > Δ (20%)
    const delta = 0.20;
    const change = glatt.map((val, i) => {
      if (i === 0) return false;
      return Math.abs(val - glatt[i-1]) > delta;
    });
    
    // Step 4: Segment with persistence requirements
    const min_len_old = 3;
    const min_len_new = 2;
    const segments = [];
    let start = 0;
    
    for (let i = 1; i < change.length - 1; i++) {
      if (change[i] && 
          (i - start) >= min_len_old && 
          (change.length - i) >= min_len_new) {
        
        // Check stability of next min_len_new values
        let stable = true;
        for (let j = i + 1; j < Math.min(i + 1 + min_len_new, glatt.length); j++) {
          if (Math.abs(glatt[j] - glatt[i]) > delta / 2) {
            stable = false;
            break;
          }
        }
        
        if (stable) {
          segments.push({ start, end: i - 1 });
          start = i;
          i += min_len_new; // Skip the new kort
        }
      }
    }
    
    // Add final segment
    if (start < glatt.length) {
      segments.push({ start, end: glatt.length - 1 });
    }
    
    // Step 5: Merge short segments if needed
    const mergedSegments = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const length = seg.end - seg.start + 1;
      
      if (length < min_len_old && segments.length > 1) {
        // Find nearest neighbor by uføregrad distance
        let nearestIdx = -1;
        let minDistance = Infinity;
        
        const segmentValues = glatt.slice(seg.start, seg.end + 1);
        const segUfore = 1 - segmentValues.reduce((a, b) => a + b, 0) / segmentValues.length;
        
        for (let j = 0; j < segments.length; j++) {
          if (j === i) continue;
          const otherSeg = segments[j];
          const otherSegmentValues = glatt.slice(otherSeg.start, otherSeg.end + 1);
          const otherUfore = 1 - otherSegmentValues.reduce((a, b) => a + b, 0) / otherSegmentValues.length;
          const distance = Math.abs(segUfore - otherUfore);
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestIdx = j;
          }
        }
        
        if (nearestIdx !== -1) {
          const nearestSeg = segments[nearestIdx];
          const mergedSeg = {
            start: Math.min(seg.start, nearestSeg.start),
            end: Math.max(seg.end, nearestSeg.end)
          };
          
          segments.splice(Math.max(i, nearestIdx), 1);
          segments.splice(Math.min(i, nearestIdx), 1, mergedSeg);
          i--;
        } else {
          mergedSegments.push(seg);
        }
      } else {
        mergedSegments.push(seg);
      }
    }
    
    // Step 6: Calculate average work percentage and uføregrad for each segment
    const finalSegments = (mergedSegments.length > 0 ? mergedSegments : segments).map(seg => {
      const segmentValues = glatt.slice(seg.start, seg.end + 1);
      const avgStilling = segmentValues.reduce((a, b) => a + b, 0) / segmentValues.length;
      const avgUfore = (1 - avgStilling) * 100;
      const roundedUfore = Math.round(avgUfore / 5) * 5; // Round to nearest 5%
      
      return {
        uforegrad: roundedUfore,
        fraIndex: seg.start,
        tilIndex: seg.end,
        fraDato: analyseData[seg.start].fraDato,
        tilDato: analyseData[seg.end].tilDato,
        avgStilling: avgStilling * 100,
        lengde: seg.end - seg.start + 1
      };
    });

    // Calculate overall average from all analyzed data
    const totalHours = analyseData.reduce((sum, mk) => sum + mk.hours, 0);
    const avgHours = totalHours / analyseData.length;
    const overallUforegradExact = 100 - (avgHours / 75) * 100;
    const overallUforegrad = Math.round(overallUforegradExact / 5) * 5;
    
    console.error('FINAL CALCULATION DEBUG:', {
      filteredMeldekortCount: filteredMeldekortData.length,
      analyseDataCount: analyseData.length,
      avgHours: avgHours,
      overallUforegrad: overallUforegrad,
      firstAnalyseData: analyseData[0],
      lastAnalyseData: analyseData[analyseData.length - 1]
    });
    
    setAvgUforegrad(overallUforegrad);
    setAvgUforegradExact(overallUforegradExact);
    setUforegradDateRange({
      fraDato: analyseData[0].fraDato,
      tilDato: analyseData[analyseData.length - 1].tilDato
    });
    
    // Set periods if there are actual changes detected
    if (finalSegments.length > 1) {
      setUforegradPerioder(finalSegments);
    } else {
      setUforegradPerioder(null);
    }

    // Check for warnings
    checkMeldekortWarnings(filteredMeldekortData);
    } catch (error) {
      console.error('ERROR IN analyzeUforegradChanges:', error);
      console.error('Stack trace:', error.stack);
    }
  };

  // Check for meldekort warnings
  const checkMeldekortWarnings = (meldekortData: Array<{hours: number; fraDato: string; tilDato: string}>) => {
    console.log('Checking meldekort warnings for:', meldekortData.length, 'meldekort');
    const warnings: Array<{
      type: 'gap' | 'low_uforegrad';
      message: string;
      detail: string;
    }> = [];
    
    // Check for 30+ day gaps between meldekort
    for (let i = 0; i < meldekortData.length - 1; i++) {
      const currentEnd = parseDate(meldekortData[i].tilDato);
      const nextStart = parseDate(meldekortData[i + 1].fraDato);
      
      if (currentEnd && nextStart) {
        const gapDays = Math.floor((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Gap between meldekort ${i + 1} and ${i + 2}:`, {
          currentEnd: meldekortData[i].tilDato,
          nextStart: meldekortData[i + 1].fraDato,
          gapDays: gapDays
        });
        
        if (gapDays >= 30) {
          console.log('Gap warning triggered:', gapDays, 'days');
          warnings.push({
            type: 'gap' as const,
            message: `${gapDays} dagers gap mellom meldekort ${i + 1} og ${i + 2}`,
            detail: `Fra ${meldekortData[i].tilDato} til ${meldekortData[i + 1].fraDato}`
          });
        }
      }
    }
    
    // Check for 2+ meldekort with uføregrad below 20%
    const lowUforegradMeldekort = meldekortData.filter(mk => {
      const workPct = (mk.hours / 75) * 100;
      const uforegrad = 100 - workPct;
      return uforegrad < 20;
    });
    
    console.log('Low uføregrad check:', {
      totalMeldekort: meldekortData.length,
      lowUforegradCount: lowUforegradMeldekort.length,
      examples: lowUforegradMeldekort.slice(0, 3).map(mk => ({
        hours: mk.hours,
        uforegrad: 100 - (mk.hours / 75) * 100,
        period: `${mk.fraDato} - ${mk.tilDato}`
      }))
    });
    
    if (lowUforegradMeldekort.length >= 2) {
      console.log('Low uføregrad warning triggered:', lowUforegradMeldekort.length, 'meldekort');
      warnings.push({
        type: 'low_uforegrad' as const,
        message: `${lowUforegradMeldekort.length} meldekort viser uføregrad under 20%`,
        detail: `Dette kan påvirke retten til uføretrygd`
      });
    }
    
    // Store warnings in state to display in the uføregrad card
    console.log('Final warnings to display:', warnings);
    setMeldekortWarnings(warnings);
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
    console.log('Foreldelse check:', {
      søknadRegistrert,
      aapFra,
      regDate: reg,
      fraDate: fra
    });
    
    if (reg && fra) {
      const diffMs = reg.getTime() - fra.getTime();
      const threeYearsMs = 365 * 24 * 60 * 60 * 1000 * 3;
      const diffYears = diffMs / (365 * 24 * 60 * 60 * 1000);
      
      console.log('Foreldelse calculation:', {
        diffMs,
        threeYearsMs,
        diffYears,
        hasForeldelse: diffMs > threeYearsMs
      });
      
      if (diffMs > threeYearsMs) {
        // Calculate date 3 years back from registration date
        const threeYearsBack = new Date(reg);
        threeYearsBack.setFullYear(threeYearsBack.getFullYear() - 3);
        const etterbetalingsDato = formatDate(threeYearsBack);
        
        const result = { 
          text: 'Foreldelse', 
          isValid: false, 
          etterbetalingFra: etterbetalingsDato
        };
        console.log('Foreldelse detected, returning:', result);
        return result;
      } else {
        const result = { 
          text: 'Ikke foreldelse', 
          isValid: true, 
          etterbetalingFra: null
        };
        console.log('No foreldelse, returning:', result);
        return result;
      }
    }
    console.log('Missing dates, returning default');
    return { text: '', isValid: true, etterbetalingFra: null };
  };

  const foreldelseStatus = getForeldelseStatus();

  // Parse salary history and check for 15% increase
  // Parse salary history from Excel data (tab-separated format) or legacy DSOP format
  const parseSalaryHistory = () => {
    if (!rawSalaryData.trim() || !sykdato) return null;

    const lines = rawSalaryData.trim().split('\n');
    
    // First, try to parse as Excel data (tab-separated)
    if (lines.length > 1 && lines.some(line => line.includes('\t'))) {
      return parseExcelSalaryData(lines);
    }
    
    // Fallback to old DSOP format for backwards compatibility
    return parseDSOPSalaryData(lines);
  };

  // Parse Excel format (tab-separated columns)
  const parseExcelSalaryData = (lines) => {
    const salaryData = [];
    let headerIndex = -1;
    let dateColumnIndex = -1;
    let salaryColumnIndex = -1;
    let percentageColumnIndex = -1;

    console.log('Parsing Excel data - total lines:', lines.length);

    // Find header row and column indices
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split('\t');
      console.log(`Line ${i} columns:`, columns);
      
      // Look for header patterns
      for (let j = 0; j < columns.length; j++) {
        const col = columns[j].toLowerCase().trim();
        if ((col.includes('gjelderfradato') || col.includes('gjelder') || 
            col.includes('fra dato') || col.includes('dato')) && dateColumnIndex === -1) {
          headerIndex = i;
          dateColumnIndex = j;
          console.log('Found date column at index:', j);
        }
        if ((col.includes('lønn') || col.includes('lonn')) && !col.includes('grunnlag') && salaryColumnIndex === -1) {
          salaryColumnIndex = j;
          console.log('Found salary column at index:', j);
        }
        if ((col.includes('stillingsprosent') || col.includes('prosent') || col.includes('pst')) && percentageColumnIndex === -1) {
          percentageColumnIndex = j;
          console.log('Found percentage column at index:', j);
        }
      }
      
      if (headerIndex >= 0 && dateColumnIndex >= 0 && salaryColumnIndex >= 0) {
        break;
      }
    }

    console.log('Excel parsing - found columns:', {
      headerIndex,
      dateColumnIndex,
      salaryColumnIndex,
      percentageColumnIndex
    });

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split('\t');
      console.log(`Processing data row ${i}:`, columns);
      
      // Extract date
      const dateText = columns[dateColumnIndex]?.trim();
      if (!dateText) continue;
      
      // Handle Excel date format with time (remove time part)
      const cleanDateText = dateText.split(' ')[0];
      const date = parseDate(cleanDateText);
      if (!date) {
        console.log('Could not parse date:', dateText, 'cleaned:', cleanDateText);
        continue;
      }
      
      // Extract salary
      const salaryText = columns[salaryColumnIndex]?.trim().replace(/[^\d]/g, '');
      const salary = parseInt(salaryText);
      if (isNaN(salary)) {
        console.log('Could not parse salary:', columns[salaryColumnIndex]);
        continue;
      }
      
      // Extract percentage (Excel format is 0-1 scale, convert to 0-100)
      let percentage = 100;
      if (percentageColumnIndex >= 0 && columns[percentageColumnIndex]) {
        const percentText = columns[percentageColumnIndex].trim();
        const percentValue = parseFloat(percentText);
        if (!isNaN(percentValue) && percentValue >= 0 && percentValue <= 1) {
          percentage = Math.round(percentValue * 100); // Convert 0-1 to 0-100
        } else if (!isNaN(percentValue) && percentValue >= 0 && percentValue <= 100) {
          percentage = Math.round(percentValue); // Already in 0-100 format
        }
      }
      
      console.log('Parsed entry:', { date: date.toISOString(), salary, percentage });
      
      salaryData.push({
        date,
        salary, // This is already nominal salary (LønnN) from Excel
        percentage
      });
    }

    console.log('Excel parsed salary data:', salaryData);
    return salaryData.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  // Original DSOP format parser (for backwards compatibility)
  const parseDSOPSalaryData = (lines) => {
    const salaryData = [];
    let dateSection = false;
    let salarySection = false;
    let percentSection = false;
    let dates = [];
    let salaries = [];
    let percentages = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      if (line.includes('Gjelder fra dato')) {
        dateSection = true;
        salarySection = false;
        percentSection = false;
        continue;
      } else if (line.includes('Lønn') && !line.includes('FastLønn') && !line.includes('a-melding')) {
        dateSection = false;
        salarySection = true;
        percentSection = false;
        continue;
      } else if (line.includes('Stillingsprosent')) {
        dateSection = false;
        salarySection = false;
        percentSection = true;
        continue;
      } else if (line.includes('Type lønn')) {
        break;
      }

      if (dateSection && line && !line.includes('Gjelder')) {
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(line)) {
          dates.push(line);
        }
      } else if (salarySection && line && !line.includes('Lønn')) {
        const cleanSalary = line.replace(/\s/g, '').replace(',', '.');
        if (/^\d+\.?\d*$/.test(cleanSalary)) {
          salaries.push(cleanSalary);
        }
      } else if (percentSection && line && !line.includes('Stillingsprosent')) {
        const cleanPercent = line.replace(/\s/g, '').replace(',', '.');
        if (/^\d+\.?\d*$/.test(cleanPercent)) {
          percentages.push(cleanPercent);
        }
      }
    }

    // Combine the data
    const minLength = Math.min(dates.length, salaries.length);
    for (let i = 0; i < minLength; i++) {
      const dateStr = dates[i];
      const salaryStr = salaries[i];
      const percentStr = percentages[i] || '100.00';
      
      const salary = parseFloat(salaryStr);
      const percent = parseFloat(percentStr);
      
      if (!isNaN(salary) && salary >= 0) { // Allow 0 salary entries
        const parsedDate = parseDate(dateStr);
        if (parsedDate) {
          salaryData.push({
            date: parsedDate,
            salary: salary,
            percentage: isNaN(percent) ? 100 : percent  // Only default to 100 if percent is NaN, preserve 0
          });
        }
      }
    }

    console.log('DSOP parsed salary data:', salaryData);
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

  // Enhanced salary increase check - checks all salaries up to 3 months before sick date
  const checkSalaryIncrease = () => {
    const salaryHistory = parseSalaryHistory();
    if (!salaryHistory || salaryHistory.length < 2 || !sykdato) {
      console.log('Early exit from checkSalaryIncrease:', { 
        hasHistory: !!salaryHistory, 
        historyLength: salaryHistory?.length, 
        hasSykdato: !!sykdato 
      });
      return null;
    }

    const sickDate = parseDate(sykdato);
    if (!sickDate) return null;

    // Find salary at sick date (most recent before or at sick date)
    const salaryAtSick = salaryHistory.find(entry => 
      entry.date <= sickDate
    );

    if (!salaryAtSick || salaryAtSick.salary === 0) {
      console.log('Salary at sick date is 0 or missing, skipping...');
      return null;
    }

    // Calculate cutoff date (3 months before sick date)
    const threeMonthsBefore = new Date(sickDate);
    threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);

    // Filter salary history to only include entries up to 3 months before sick date
    const eligibleSalaries = salaryHistory.filter(entry => 
      entry.date <= threeMonthsBefore && entry.salary > 0
    );

    if (eligibleSalaries.length === 0) {
      console.log('No eligible salary entries found (3+ months before sick date)');
      return null;
    }

    // Convert sick date salary to 100% position
    const salaryAtSick100 = (salaryAtSick.salary * 100) / salaryAtSick.percentage;

    // Function to get threshold percentage based on time difference
    const getThresholdPercentage = (monthsDifference: number) => {
      if (monthsDifference >= 24) return 15.0; // 2+ years: 15%
      if (monthsDifference >= 12) return 7.5;  // 1+ years: 7.5%
      if (monthsDifference >= 6) return 5.0;   // 6+ months: 5%
      return 2.5; // 3-6 months: 2.5%
    };

    // Check each eligible salary for threshold violations
    const violations = [];
    
    for (const historicalSalary of eligibleSalaries) {
      // If percentage is 0, set salary to 0
      const adjustedHistoricalSalary = historicalSalary.percentage === 0 ? 0 : historicalSalary.salary;
      const historicalSalary100 = historicalSalary.percentage === 0 ? 0 : (adjustedHistoricalSalary * 100) / historicalSalary.percentage;
      
      // Calculate time difference in months
      const timeDiffMs = sickDate.getTime() - historicalSalary.date.getTime();
      const monthsDifference = timeDiffMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      
      const thresholdPercentage = getThresholdPercentage(monthsDifference);
      const increasePercentage = historicalSalary100 === 0 ? 0 : ((salaryAtSick100 - historicalSalary100) / historicalSalary100) * 100;
      
      if (increasePercentage > thresholdPercentage) {
        violations.push({
          historicalSalary: adjustedHistoricalSalary,
          historicalSalary100: Math.round(historicalSalary100),
          historicalDate: formatDate(historicalSalary.date),
          monthsDifference: Math.round(monthsDifference * 10) / 10,
          thresholdPercentage,
          increasePercentage: Math.round(increasePercentage * 100) / 100,
          exceedsThreshold: true
        });
      }
    }

    // Find the most significant violation (highest percentage over threshold)
    let mostSignificantViolation = null;
    let highestExcess = 0;

    for (const violation of violations) {
      const excess = violation.increasePercentage - violation.thresholdPercentage;
      if (excess > highestExcess) {
        highestExcess = excess;
        mostSignificantViolation = violation;
      }
    }

    // Calculate actual 2 years before sick date for display
    const twoYearsBeforeCalc = new Date(sickDate);
    twoYearsBeforeCalc.setFullYear(twoYearsBeforeCalc.getFullYear() - 2);
    
    // Find salary from exactly 2 years before (most recent before or at 2 years before sick date)
    const actualSalaryTwoYearsBefore = salaryHistory.find(entry => 
      entry.date <= twoYearsBeforeCalc
    );
    
    const actualSalaryTwoYearsBefore100 = actualSalaryTwoYearsBefore 
      ? (actualSalaryTwoYearsBefore.salary * 100) / actualSalaryTwoYearsBefore.percentage
      : null;
    
    const actualIncreasePercentage = actualSalaryTwoYearsBefore100
      ? ((salaryAtSick100 - actualSalaryTwoYearsBefore100) / actualSalaryTwoYearsBefore100) * 100
      : null;

    console.log('Enhanced salary check results:', {
      sickDate: formatDate(sickDate),
      salaryAtSick: salaryAtSick.salary,
      salaryAtSick100: Math.round(salaryAtSick100),
      eligibleSalariesCount: eligibleSalaries.length,
      violationsCount: violations.length,
      mostSignificantViolation,
      actualSalaryTwoYearsBefore: actualSalaryTwoYearsBefore?.salary,
      actualSalaryTwoYearsBefore100: actualSalaryTwoYearsBefore100 ? Math.round(actualSalaryTwoYearsBefore100) : null,
      actualIncreasePercentage: actualIncreasePercentage ? Math.round(actualIncreasePercentage * 100) / 100 : null
    });
    
    // Check for frequent salary changes (6+ times per year)
    const checkFrequentSalaryChanges = (salaryHistory: any[], sickDate: Date) => {
      if (!salaryHistory || salaryHistory.length === 0) return { hasFrequentChanges: false, changesPerYear: 0 };
      
      // Get salaries from the last 12 months before sick date
      const oneYearBefore = new Date(sickDate);
      oneYearBefore.setFullYear(oneYearBefore.getFullYear() - 1);
      
      const lastYearSalaries = salaryHistory.filter(entry => 
        entry.date >= oneYearBefore && entry.date <= sickDate
      ).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      if (lastYearSalaries.length < 2) return { hasFrequentChanges: false, changesPerYear: 0 };
      
      // Count salary changes (when salary or percentage changes from previous entry)
      let changes = 0;
      for (let i = 1; i < lastYearSalaries.length; i++) {
        const current = lastYearSalaries[i];
        const previous = lastYearSalaries[i - 1];
        
        // Consider it a change if salary or percentage changed
        if (current.salary !== previous.salary || current.percentage !== previous.percentage) {
          changes++;
        }
      }
      
      return {
        hasFrequentChanges: changes >= 6,
        changesPerYear: changes
      };
    };

    const checkThresholdViolationDuration = (salaryHistory: any[], sickDate: Date, sickSalary: number) => {
      if (!salaryHistory || salaryHistory.length === 0) {
        return {
          twoYearToOneYear: { hasViolation: false, maxConsecutiveMonths: 0, violationPeriods: [], threshold: 0 },
          oneYearToSick: { hasViolation: false, maxConsecutiveMonths: 0, violationPeriods: [], threshold: 0 }
        };
      }
      
      console.log('Threshold violation check - sick salary:', sickSalary);
      const sortedHistory = [...salaryHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Check 2-year to 1-year period (15% threshold)
      const twoYearsBefore = new Date(sickDate);
      twoYearsBefore.setFullYear(twoYearsBefore.getFullYear() - 2);
      const oneYearBefore = new Date(sickDate);
      oneYearBefore.setFullYear(oneYearBefore.getFullYear() - 1);
      
      const twoYearToOneYearSalaries = sortedHistory.filter(entry => 
        entry.date >= twoYearsBefore && entry.date < oneYearBefore
      );
      
      console.log('2-year to 1-year period:', formatDate(twoYearsBefore), 'to', formatDate(oneYearBefore));
      console.log('Salaries in 2-year to 1-year period:', twoYearToOneYearSalaries.map(s => ({
        date: formatDate(s.date),
        salary: s.salary,
        percentage: s.percentage
      })));
      
      const threshold85 = sickSalary * 0.85;
      console.log('85% threshold:', threshold85);
      let consecutiveViolations15 = 0;
      let maxConsecutiveViolations15 = 0;
      let violationPeriods15 = [];
      let currentViolationStart15 = null;
      
      for (let i = 0; i < twoYearToOneYearSalaries.length; i++) {
        const entry = twoYearToOneYearSalaries[i];
        const nextEntry = twoYearToOneYearSalaries[i + 1];
        
        // Calculate months this salary applies to
        const entryDate = new Date(entry.date);
        const nextDate = nextEntry ? new Date(nextEntry.date) : new Date(oneYearBefore);
        const monthsInPeriod = Math.abs((nextDate.getFullYear() - entryDate.getFullYear()) * 12 + 
                                       (nextDate.getMonth() - entryDate.getMonth()));
        
        console.log(`Entry ${i}:`, formatDate(entry.date), 'salary:', entry.salary, 'vs threshold:', threshold85, 
                    'below:', entry.salary < threshold85, 'months in period:', monthsInPeriod);
        
        if (entry.salary < threshold85) {
          if (currentViolationStart15 === null) {
            currentViolationStart15 = formatDate(entry.date);
            console.log('Starting violation period at:', currentViolationStart15);
          }
          consecutiveViolations15 += monthsInPeriod;
          maxConsecutiveViolations15 = Math.max(maxConsecutiveViolations15, consecutiveViolations15);
          console.log('Consecutive violations now:', consecutiveViolations15, 'months');
        } else {
          console.log('Salary above threshold, checking if we had 3+ violations...');
          if (consecutiveViolations15 >= 3 && currentViolationStart15) {
            console.log('Adding violation period:', currentViolationStart15, 'months:', consecutiveViolations15);
            violationPeriods15.push({
              start: currentViolationStart15,
              months: consecutiveViolations15,
              endDate: formatDate(entry.date)
            });
          }
          consecutiveViolations15 = 0;
          currentViolationStart15 = null;
        }
      }
      
      // Check final period if it ends with violations
      if (consecutiveViolations15 >= 3 && currentViolationStart15) {
        violationPeriods15.push({
          start: currentViolationStart15,
          months: consecutiveViolations15,
          endDate: '1 år før syk'
        });
      }
      
      // Check 1-year to sick date period (7.5% threshold)
      const oneYearToSickSalaries = sortedHistory.filter(entry => 
        entry.date >= oneYearBefore && entry.date <= sickDate
      );
      
      const threshold92_5 = sickSalary * 0.925;
      let consecutiveViolations7_5 = 0;
      let maxConsecutiveViolations7_5 = 0;
      let violationPeriods7_5 = [];
      let currentViolationStart7_5 = null;
      
      for (let i = 0; i < oneYearToSickSalaries.length; i++) {
        const entry = oneYearToSickSalaries[i];
        const nextEntry = oneYearToSickSalaries[i + 1];
        
        // Calculate months this salary applies to
        const entryDate = new Date(entry.date);
        const nextDate = nextEntry ? new Date(nextEntry.date) : new Date(sickDate);
        const monthsInPeriod = Math.abs((nextDate.getFullYear() - entryDate.getFullYear()) * 12 + 
                                       (nextDate.getMonth() - entryDate.getMonth()));
        
        console.log(`1-year Entry ${i}:`, formatDate(entry.date), 'salary:', entry.salary, 'vs threshold:', threshold92_5, 
                    'below:', entry.salary < threshold92_5, 'months in period:', monthsInPeriod);
        
        if (entry.salary < threshold92_5) {
          if (currentViolationStart7_5 === null) {
            currentViolationStart7_5 = formatDate(entry.date);
          }
          consecutiveViolations7_5 += monthsInPeriod;
          maxConsecutiveViolations7_5 = Math.max(maxConsecutiveViolations7_5, consecutiveViolations7_5);
        } else {
          if (consecutiveViolations7_5 >= 3 && currentViolationStart7_5) {
            violationPeriods7_5.push({
              start: currentViolationStart7_5,
              months: consecutiveViolations7_5,
              endDate: formatDate(entry.date)
            });
          }
          consecutiveViolations7_5 = 0;
          currentViolationStart7_5 = null;
        }
      }
      
      // Check final period if it ends with violations
      if (consecutiveViolations7_5 >= 3 && currentViolationStart7_5) {
        violationPeriods7_5.push({
          start: currentViolationStart7_5,
          months: consecutiveViolations7_5,
          endDate: 'sykdato'
        });
      }
      
      return {
        twoYearToOneYear: {
          hasViolation: maxConsecutiveViolations15 >= 3,
          maxConsecutiveMonths: maxConsecutiveViolations15,
          violationPeriods: violationPeriods15,
          threshold: threshold85
        },
        oneYearToSick: {
          hasViolation: maxConsecutiveViolations7_5 >= 3,
          maxConsecutiveMonths: maxConsecutiveViolations7_5,
          violationPeriods: violationPeriods7_5,
          threshold: threshold92_5
        }
      };
    };
    
    const frequentChangesResult = checkFrequentSalaryChanges(salaryHistory, sickDate);
    console.log('Frequent salary changes check:', frequentChangesResult);

    // Check if the 2-year comparison specifically violates the 15% threshold
    const twoYearViolation = actualIncreasePercentage ? actualIncreasePercentage > 15 : false;
    
    // Check 1-year comparison for 7.5% threshold
    const oneYearBeforeCalc = new Date(sickDate);
    oneYearBeforeCalc.setFullYear(oneYearBeforeCalc.getFullYear() - 1);
    
    const actualSalaryOneYearBefore = salaryHistory.find(entry => 
      entry.date <= oneYearBeforeCalc
    );
    
    const actualSalaryOneYearBefore100 = actualSalaryOneYearBefore 
      ? (actualSalaryOneYearBefore.salary * 100) / actualSalaryOneYearBefore.percentage
      : null;
    
    const oneYearIncreasePercentage = actualSalaryOneYearBefore100
      ? ((salaryAtSick100 - actualSalaryOneYearBefore100) / actualSalaryOneYearBefore100) * 100
      : null;
    
    const oneYearViolation = oneYearIncreasePercentage ? oneYearIncreasePercentage > 7.5 : false;
    
    // Function to find when salary increased above threshold
    const findSalaryIncreaseDate = (targetPercentage: number, comparisonDate: Date) => {
      if (!salaryHistory || salaryHistory.length === 0) return null;
      
      // Get all salaries between comparison date and sick date
      const relevantSalaries = salaryHistory.filter(entry => 
        entry.date >= comparisonDate && entry.date <= sickDate
      ).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      if (relevantSalaries.length < 2) return null;
      
      // Find the first salary entry that shows an increase above threshold
      for (let i = 1; i < relevantSalaries.length; i++) {
        const current = relevantSalaries[i];
        const previous = relevantSalaries[i - 1];
        
        // Skip if either entry has 0% position (no meaningful salary comparison)
        if (current.percentage === 0 || previous.percentage === 0) continue;
        
        const currentSalary100 = (current.salary * 100) / current.percentage;
        const previousSalary100 = (previous.salary * 100) / previous.percentage;
        
        const increasePercentage = ((currentSalary100 - previousSalary100) / previousSalary100) * 100;
        
        if (increasePercentage > targetPercentage) {
          return {
            date: formatDate(current.date),
            increasePercentage: Math.round(increasePercentage * 100) / 100,
            fromSalary: Math.round(previousSalary100),
            toSalary: Math.round(currentSalary100)
          };
        }
      }
      
      return null;
    };
    
    // Find salary increase dates if violations exist
    const twoYearIncreaseDate = twoYearViolation ? findSalaryIncreaseDate(15, twoYearsBeforeCalc) : null;
    const oneYearIncreaseDate = oneYearViolation ? findSalaryIncreaseDate(7.5, oneYearBeforeCalc) : null;

    // Create "Se alle" list - all salaries between sick date and 30 months before (2.5 years)
    const thirtyMonthsBeforeForList = new Date(sickDate);
    thirtyMonthsBeforeForList.setMonth(thirtyMonthsBeforeForList.getMonth() - 30);
    
    const seAlleList = salaryHistory.filter(entry => 
      entry.date <= sickDate && entry.date >= thirtyMonthsBeforeForList
    ).map(entry => {
      // If percentage is 0, set salary to 0 regardless of what's in salary field
      const adjustedSalary = entry.percentage === 0 ? 0 : entry.salary;
      const entry100 = entry.percentage === 0 ? 0 : (adjustedSalary * 100) / entry.percentage;
      const increasePercentage = entry.percentage === 0 ? null : ((salaryAtSick100 - entry100) / entry100) * 100;
      const monthsBeforeSick = Math.round(((sickDate.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) * 10) / 10;
      
      // Apply same threshold logic as karens evaluation
      const getThresholdForDisplay = (monthsDiff: number) => {
        if (monthsDiff >= 24) return 15.0; // 2+ years: 15%
        if (monthsDiff >= 12) return 7.5;  // 1+ years: 7.5%
        if (monthsDiff >= 6) return 5.0;   // 6+ months: 5%
        return 2.5; // 3-6 months: 2.5%
      };
      
      const thresholdPercentage = getThresholdForDisplay(monthsBeforeSick);
      const isOK = increasePercentage === null ? null : (increasePercentage <= thresholdPercentage);
      
      return {
        date: formatDate(entry.date),
        originalSalary: adjustedSalary,
        salary100: Math.round(entry100),
        increasePercentage: increasePercentage === null ? null : (Math.round(increasePercentage * 100) / 100),
        monthsBeforeSick: monthsBeforeSick,
        thresholdPercentage: thresholdPercentage,
        isOK: isOK
      };
    }).sort((a, b) => a.monthsBeforeSick - b.monthsBeforeSick);

    // Only consider "recent violations" (within 3 years) for the "andre overtredelser" status
    // This excludes very old salary changes that are less relevant for current karens assessment
    const recentViolations = violations.filter(v => v.monthsDifference <= 36); // Last 3 years
    
    return {
      salaryAtSick: salaryAtSick.salary,
      salaryAtSick100: Math.round(salaryAtSick100),
      sickDate: formatDate(sickDate),
      eligibleSalariesCount: eligibleSalaries.length,
      violationsCount: violations.length,
      violations,
      mostSignificantViolation,
      isHighIncrease: twoYearViolation || oneYearViolation, // Either 2-year or 1-year violation triggers main display
      hasOtherViolations: recentViolations.length > 0 && !twoYearViolation && !oneYearViolation, // Only show "andre overtredelser" for recent violations when both main checks are OK
      // 2-year comparison data
      twoYearViolation,
      actualSalaryTwoYearsBefore: actualSalaryTwoYearsBefore?.salary,
      actualSalaryTwoYearsBefore100: actualSalaryTwoYearsBefore100 ? Math.round(actualSalaryTwoYearsBefore100) : null,
      twoYearIncreasePercentage: actualIncreasePercentage ? Math.round(actualIncreasePercentage * 100) / 100 : null,
      twoYearIncreaseDate,
      // 1-year comparison data
      oneYearViolation,
      actualSalaryOneYearBefore: actualSalaryOneYearBefore?.salary,
      actualSalaryOneYearBefore100: actualSalaryOneYearBefore100 ? Math.round(actualSalaryOneYearBefore100) : null,
      oneYearIncreasePercentage: oneYearIncreasePercentage ? Math.round(oneYearIncreasePercentage * 100) / 100 : null,
      oneYearIncreaseDate,
      oneYearBeforeDate: actualSalaryOneYearBefore ? formatDate(actualSalaryOneYearBefore.date) : null,
      seAlleList, // New "Se alle" list with all salaries in 2-year period
      // Show actual 2 years before salary for display
      salaryTwoYearsBefore: actualSalaryTwoYearsBefore?.salary || null,
      salaryTwoYearsBefore100: actualSalaryTwoYearsBefore100 ? Math.round(actualSalaryTwoYearsBefore100) : null,
      increasePercentage: actualIncreasePercentage ? Math.round(actualIncreasePercentage * 100) / 100 : null,
      twoYearsBeforeDate: actualSalaryTwoYearsBefore ? formatDate(actualSalaryTwoYearsBefore.date) : null,
      frequentChanges: frequentChangesResult,
      thresholdViolations: checkThresholdViolationDuration(salaryHistory, sickDate, salaryAtSick100)
    };
  };

  // G-regulation table with dates and amounts
  const G_REGULATION_TABLE = [
    { date: '01.05.2025', amount: 130160 },
    { date: '01.05.2024', amount: 124028 },
    { date: '01.05.2023', amount: 118620 },
    { date: '01.05.2022', amount: 111477 },
    { date: '01.05.2021', amount: 106399 },
    { date: '01.05.2020', amount: 101351 },
    { date: '01.05.2019', amount: 99858 },
    { date: '01.05.2018', amount: 96883 },
    { date: '01.05.2017', amount: 93634 },
    { date: '01.05.2016', amount: 92576 },
    { date: '01.05.2015', amount: 90068 },
    { date: '01.05.2014', amount: 88370 },
    { date: '01.05.2013', amount: 85245 },
    { date: '01.05.2012', amount: 82122 },
    { date: '01.05.2011', amount: 79216 },
    { date: '01.05.2010', amount: 75641 },
    { date: '01.05.2009', amount: 72881 },
    { date: '01.05.2008', amount: 70256 },
    { date: '01.05.2007', amount: 66812 },
    { date: '01.05.2006', amount: 62892 },
    { date: '01.05.2005', amount: 60699 },
    { date: '01.05.2004', amount: 58778 },
    { date: '01.05.2003', amount: 56861 },
    { date: '01.05.2002', amount: 54170 },
    { date: '01.05.2001', amount: 51360 },
    { date: '01.05.2000', amount: 49090 }
  ];

  // Get G-regulation amount for a specific date
  const getGRegulationForDate = (targetDate: Date) => {
    // Find the G-regulation that was active on the target date
    // Use the most recent G-regulation that was in effect before or on the target date
    for (const regulation of G_REGULATION_TABLE) {
      const regulationDate = parseDate(regulation.date);
      if (regulationDate && regulationDate <= targetDate) {
        return regulation.amount;
      }
    }
    // Fallback to the oldest G-regulation if no match found
    return G_REGULATION_TABLE[G_REGULATION_TABLE.length - 1].amount;
  };

  // Calculate G-regulated salary
  const calculateGRegulatedSalary = () => {
    const salaryHistory = parseSalaryHistory();
    if (!salaryHistory || salaryHistory.length < 2 || !sykdato) {
      return null;
    }

    const sickDate = parseDate(sykdato);
    if (!sickDate) return null;

    const twoYearsBefore = new Date(sickDate);
    twoYearsBefore.setFullYear(twoYearsBefore.getFullYear() - 2);

    // Find salary from 2 years before (most recent before or at 2 years before sick date)
    const salaryTwoYearsBefore = salaryHistory.find(entry => 
      entry.date <= twoYearsBefore
    );

    if (!salaryTwoYearsBefore) return null;

    // Get G-regulation for first sick day
    const gAtSickDate = getGRegulationForDate(sickDate);
    
    // Get G-regulation for when the salary 2 years before was in effect
    const gAtSalaryDate = getGRegulationForDate(salaryTwoYearsBefore.date);

    // Calculate G-regulated salary: Lønn 2 år før syk × (G per første syke dag ÷ G som gjelder for lønnen 2 år før syk)
    const gRegulatedSalary = salaryTwoYearsBefore.salary * (gAtSickDate / gAtSalaryDate);
    
    // Convert G-regulated salary to 100% position using the work percentage from 2 years before
    const gRegulatedSalary100 = (gRegulatedSalary * 100) / salaryTwoYearsBefore.percentage;

    return {
      originalSalary: salaryTwoYearsBefore.salary,
      originalPercentage: salaryTwoYearsBefore.percentage,
      gRegulatedSalary: Math.round(gRegulatedSalary),
      gRegulatedSalary100: Math.round(gRegulatedSalary100),
      gAtSickDate,
      gAtSalaryDate,
      salaryDate: formatDate(salaryTwoYearsBefore.date),
      sickDate: formatDate(sickDate)
    };
  };

  const gRegulatedCalculation = calculateGRegulatedSalary();
  const salaryIncreaseCheck = checkSalaryIncrease();

  // State for IF-ytelse calculation inputs
  const [fraG, setFraG] = useState('0');
  const [knekkG, setKnekkG] = useState('7.1');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');

  // Calculate ny IF-ytelse based on G-regulated salary
  const calculateNyIFYtelse = () => {
    if (!gRegulatedCalculation || !p1 || !p2) {
      return null;
    }

    const salaryHistory = parseSalaryHistory();
    if (!salaryHistory || !sykdato) {
      return null;
    }

    const sickDate = parseDate(sykdato);
    if (!sickDate) return null;

    // Get stillingsprosent from sick date (most recent before or at sick date)
    const salaryAtSick = salaryHistory.find(entry => entry.date <= sickDate);
    if (!salaryAtSick) return null;

    const x = salaryAtSick.percentage; // Stillingsprosent from rådata (for display)
    const G = gRegulatedCalculation.gAtSickDate; // G-beløp at sick date

    // Use the pre-calculated G-regulated salary at 100% (already corrected with work percentage from 2 years before)
    const gRegulatedSalary100 = gRegulatedCalculation.gRegulatedSalary100;

    // Steg 2: Calculate salary ranges using G at sick date
    const lonn_6G = Math.min(gRegulatedSalary100, 6 * G);
    const lonn_7_1G = Math.min(gRegulatedSalary100, 7.1 * G);
    const lonn_12G = Math.min(gRegulatedSalary100, 12 * G);
    
    const lonn_6_12G = Math.max(0, lonn_12G - lonn_6G); // Lønn mellom 6-12G
    const lonn_7_1_12G = Math.max(0, lonn_12G - lonn_7_1G); // Lønn mellom 7.1G-12G

    // Input values
    const p1_val = parseFloat(p1);
    const p2_val = parseFloat(p2);

    // Calculate IF-ytelse based on selected ranges
    let ny_IF_100 = 0;
    let calculationDescription = '';

    // Use the knekkG value to determine which calculation to use
    const knekkG_val = parseFloat(knekkG);
    
    if (knekkG_val === 6) {
      // Using 6G as knekkpunkt
      ny_IF_100 = (lonn_6G * p1_val / 100) + (lonn_6_12G * p2_val / 100);
      calculationDescription = `(${lonn_6G.toLocaleString('no-NO')} × ${p1}% + ${lonn_6_12G.toLocaleString('no-NO')} × ${p2}%) × ${x}%`;
    } else if (knekkG_val === 7.1) {
      // Using 7.1G as knekkpunkt
      ny_IF_100 = (lonn_7_1G * p1_val / 100) + (lonn_7_1_12G * p2_val / 100);
      calculationDescription = `(${lonn_7_1G.toLocaleString('no-NO')} × ${p1}% + ${lonn_7_1_12G.toLocaleString('no-NO')} × ${p2}%) × ${x}%`;
    }

    // Final step: Multiply by stillingsprosent at sick date
    const ny_IF = ny_IF_100 * (x / 100);

    return {
      x,
      G,
      gRegulatedSalaryOriginal: gRegulatedCalculation.gRegulatedSalary,
      gRegulatedSalary100: Math.round(gRegulatedSalary100),
      lonn_6G: Math.round(lonn_6G),
      lonn_7_1G: Math.round(lonn_7_1G),
      lonn_12G: Math.round(lonn_12G),
      lonn_6_12G: Math.round(lonn_6_12G),
      lonn_7_1_12G: Math.round(lonn_7_1_12G),
      ny_IF_100: Math.round(ny_IF_100),
      ny_IF: Math.round(ny_IF),
      calculationDescription
    };
  };

  const nyIFYtelseCalc = calculateNyIFYtelse();

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
    setFraG('0');
    setKnekkG('7.1');
    setP1('');
    setP2('');
    
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
        {/* Debug Table for Nominal Position Percentage Calculation */}
        {debugTable && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-orange-800">DEBUG: Nomert stillingsprosent beregning</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setDebugTable(null)}
                  className="text-xs"
                >
                  Lukk
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-orange-200">
                      <th className="text-left p-2 text-orange-800">Måned</th>
                      <th className="text-right p-2 text-orange-800">Dager</th>
                      <th className="text-right p-2 text-orange-800">Stilling %</th>
                      <th className="text-right p-2 text-orange-800">Vektet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugTable.map((row, index) => (
                      <tr key={index} className="border-b border-orange-100">
                        <td className="p-2 font-mono text-orange-800">{row.month}</td>
                        <td className="p-2 text-right text-orange-800">{row.days}</td>
                        <td className="p-2 text-right text-orange-800">{row.percentage}%</td>
                        <td className="p-2 text-right text-orange-800">{row.weighted.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-orange-300 font-semibold">
                      <td className="p-2 text-orange-900">Total</td>
                      <td className="p-2 text-right text-orange-900">{debugTable.reduce((sum, row) => sum + row.days, 0)}</td>
                      <td className="p-2 text-right text-orange-900">-</td>
                      <td className="p-2 text-right text-orange-900">{debugTable.reduce((sum, row) => sum + row.weighted, 0).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-orange-100">
                      <td className="p-2 font-semibold text-orange-900" colSpan={3}>Gjennomsnitt:</td>
                      <td className="p-2 text-right font-semibold text-orange-900">
                        {(debugTable.reduce((sum, row) => sum + row.weighted, 0) / debugTable.reduce((sum, row) => sum + row.days, 0)).toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
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
              <h2 className="text-lg font-medium text-slate-800">Import Lønndata</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Hvordan importere Excel-data</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Velg og kopier alle relevante rader fra Excel-arket (inkludert overskrifter)</p>
                  <p>• Lim inn dataene i feltet nedenfor</p>
                  <p>• Systemet vil automatisk gjenkjenne kolonner for dato, lønn og stillingsprosent</p>
                </div>
              </div>
              <div>
                <Label htmlFor="rawSalaryData" className="text-sm font-medium text-slate-700">
                  Excel-data (lim inn her)
                  <span className="text-slate-500 text-xs ml-1">(kopier direkte fra Excel)</span>
                </Label>
                <Textarea
                  id="rawSalaryData"
                  value={rawSalaryData}
                  onChange={(e) => setRawSalaryData(e.target.value)}
                  placeholder="Lim inn lønnsdata direkte fra Excel-ark her..."
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
              {avgUforegrad !== null && avgUforegradExact !== null && (
                <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Percent className="text-amber-600 mt-0.5 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-amber-800">Gjennomsnittlig uføregrad</h3>
                      <p className="text-lg font-semibold text-amber-700">
                        {avgUforegrad}% (eksakt: {avgUforegradExact.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Beregnet fra meldekort data
                        {uforegradDateRange && (
                          <span className="block mt-1">
                            Periode: {uforegradDateRange.fraDato} - {uforegradDateRange.tilDato}
                          </span>
                        )}
                      </p>
                      
                      {/* Display meldekort warnings */}
                      {meldekortWarnings.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {meldekortWarnings.map((warning, index) => (
                            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <div className="flex items-start space-x-2">
                                <span className="text-red-600 font-medium">⚠️</span>
                                <div>
                                  <p className="font-medium text-red-800">
                                    {warning.type === 'gap' ? 'Hull i meldekort' : 'Lav uføregrad'}
                                  </p>
                                  <p className="text-red-700 mt-1">
                                    {warning.message}
                                  </p>
                                  <p className="text-red-600 mt-1">
                                    {warning.detail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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



              {/* Salary Increase Check */}
              {salaryIncreaseCheck && (
                <div className="md:col-span-2">
                  <div className={`p-4 rounded-lg border-l-4 ${
                    salaryIncreaseCheck.isHighIncrease 
                      ? 'border-red-500 bg-red-50' 
                      : salaryIncreaseCheck.hasOtherViolations
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {salaryIncreaseCheck.isHighIncrease ? (
                          <ShieldCheck className="text-red-600 mt-0.5 h-5 w-5" />
                        ) : salaryIncreaseCheck.hasOtherViolations ? (
                          <ShieldCheck className="text-yellow-600 mt-0.5 h-5 w-5" />
                        ) : (
                          <ShieldCheck className="text-green-600 mt-0.5 h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium mb-3 ${
                          salaryIncreaseCheck.isHighIncrease 
                            ? 'text-red-800' 
                            : salaryIncreaseCheck.hasOtherViolations
                              ? 'text-yellow-800'
                              : 'text-green-800'
                        }`}>
                          {salaryIncreaseCheck.isHighIncrease 
                            ? 'Karens må vurderes' 
                            : salaryIncreaseCheck.hasOtherViolations
                              ? 'Hovedkontroll OK (andre overtredelser funnet)'
                              : 'Lønn OK'
                          }
                        </h3>
                        <div className="bg-white p-3 rounded border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {/* 2-year comparison */}
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-slate-800">2 år sammenligning</h4>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  salaryIncreaseCheck.twoYearViolation ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {salaryIncreaseCheck.twoYearViolation ? 'Over 15%' : 'Under 15%'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">
                                      Lønn 2 år før {salaryIncreaseCheck.twoYearsBeforeDate ? `(${salaryIncreaseCheck.twoYearsBeforeDate})` : ''}:
                                    </span>
                                    <span className="font-medium">
                                      {salaryIncreaseCheck.actualSalaryTwoYearsBefore100 ? 
                                        `${salaryIncreaseCheck.actualSalaryTwoYearsBefore100.toLocaleString('no-NO')} kr` : 
                                        'Ikke funnet'
                                      }
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Lønn sykdato ({salaryIncreaseCheck.sickDate}):</span>
                                    <span className="font-medium">
                                      {salaryIncreaseCheck.salaryAtSick100.toLocaleString('no-NO')} kr
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Økning:</span>
                                  <span className={`font-semibold ${
                                    salaryIncreaseCheck.twoYearViolation ? 'text-red-700' : 'text-green-700'
                                  }`}>
                                    {salaryIncreaseCheck.twoYearIncreasePercentage ? 
                                      `${salaryIncreaseCheck.twoYearIncreasePercentage > 0 ? '+' : ''}${salaryIncreaseCheck.twoYearIncreasePercentage}%` : 
                                      'Ikke beregnet'
                                    }
                                  </span>
                                </div>
                                {salaryIncreaseCheck.thresholdViolations?.twoYearToOneYear.hasViolation && (
                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                                    <strong>⚠️ Terskel brudd (85%):</strong><br/>
                                    Lønn var under 85% terskel i {salaryIncreaseCheck.thresholdViolations.twoYearToOneYear.maxConsecutiveMonths} måneder
                                    {salaryIncreaseCheck.thresholdViolations.twoYearToOneYear.violationPeriods.map((period, index) => (
                                      <div key={index} className="text-xs mt-1">
                                        Fra {period.start} til {period.endDate} ({period.months} mnd)
                                      </div>
                                    ))}
                                  </div>
                                )}

                              </div>
                            </div>
                            
                            {/* 1-year comparison */}
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-slate-800">1 år sammenligning</h4>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  salaryIncreaseCheck.oneYearViolation ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {salaryIncreaseCheck.oneYearViolation ? 'Over 7.5%' : 'Under 7.5%'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">
                                      Lønn 1 år før {salaryIncreaseCheck.oneYearBeforeDate ? `(${salaryIncreaseCheck.oneYearBeforeDate})` : ''}:
                                    </span>
                                    <span className="font-medium">
                                      {salaryIncreaseCheck.actualSalaryOneYearBefore100 ? 
                                        `${salaryIncreaseCheck.actualSalaryOneYearBefore100.toLocaleString('no-NO')} kr` : 
                                        'Ikke funnet'
                                      }
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Lønn sykdato ({salaryIncreaseCheck.sickDate}):</span>
                                    <span className="font-medium">
                                      {salaryIncreaseCheck.salaryAtSick100.toLocaleString('no-NO')} kr
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Økning:</span>
                                  <span className={`font-semibold ${
                                    salaryIncreaseCheck.oneYearViolation ? 'text-red-700' : 'text-green-700'
                                  }`}>
                                    {salaryIncreaseCheck.oneYearIncreasePercentage ? 
                                      `${salaryIncreaseCheck.oneYearIncreasePercentage > 0 ? '+' : ''}${salaryIncreaseCheck.oneYearIncreasePercentage}%` : 
                                      'Ikke beregnet'
                                    }
                                  </span>
                                </div>
                                {salaryIncreaseCheck.thresholdViolations?.oneYearToSick.hasViolation && (
                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                                    <strong>⚠️ Terskel brudd (92,5%):</strong><br/>
                                    Lønn var under 92,5% terskel i {salaryIncreaseCheck.thresholdViolations.oneYearToSick.maxConsecutiveMonths} måneder
                                    {salaryIncreaseCheck.thresholdViolations.oneYearToSick.violationPeriods.map((period, index) => (
                                      <div key={index} className="text-xs mt-1">
                                        Fra {period.start} til {period.endDate} ({period.months} mnd)
                                      </div>
                                    ))}
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Frequent salary changes warning */}
                        {salaryIncreaseCheck.frequentChanges && (
                          <div className={`mt-3 p-3 rounded-lg border ${
                            salaryIncreaseCheck.frequentChanges.hasFrequentChanges 
                              ? 'border-orange-400 bg-orange-50' 
                              : 'border-green-400 bg-green-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex-shrink-0">
                                  {salaryIncreaseCheck.frequentChanges.hasFrequentChanges ? (
                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  ) : (
                                    <ShieldCheck className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    salaryIncreaseCheck.frequentChanges.hasFrequentChanges 
                                      ? 'text-orange-800' 
                                      : 'text-green-800'
                                  }`}>
                                    {salaryIncreaseCheck.frequentChanges.hasFrequentChanges 
                                      ? 'Lønnen varierer mye' 
                                      : 'Lønnen er stabil'
                                    }
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    salaryIncreaseCheck.frequentChanges.hasFrequentChanges 
                                      ? 'text-orange-600' 
                                      : 'text-green-600'
                                  }`}>
                                    {salaryIncreaseCheck.frequentChanges.changesPerYear} endringer siste 12 måneder
                                    {salaryIncreaseCheck.frequentChanges.hasFrequentChanges 
                                      ? ' (6+ endringer kan indikere ustabil inntekt)'
                                      : ' (under 6 endringer indikerer stabil inntekt)'
                                    }
                                  </p>
                                </div>
                              </div>
                              {salaryIncreaseCheck.frequentChanges.hasFrequentChanges && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUseNominalSalary()}
                                  className={`text-xs px-3 py-1 ${
                                    useNominalSalary 
                                      ? 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800'
                                      : 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-800'
                                  }`}
                                >
                                  <Calculator className="h-3 w-3 mr-1" />
                                  {useNominalSalary ? 'Bruk faktisk lønn' : 'Bruk nomert lønn'}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Show "se alle" button when there are salaries in the 2-year period */}
                        {salaryIncreaseCheck.seAlleList && salaryIncreaseCheck.seAlleList.length > 0 && (
                            <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-orange-800">
                                    <strong>{salaryIncreaseCheck.seAlleList.length} lønnsposter</strong> funnet mellom sykdato og 2 år tilbake
                                  </p>
                                  <p className="text-xs text-orange-600 mt-1">
                                    Se alle lønnsposter i 2-års perioden med prosentvis økning til sykdato.
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        className="text-xs px-3 py-1 bg-orange-50 hover:bg-orange-100 border-orange-300"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Se alle ({salaryIncreaseCheck.violationsCount})
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle className="text-lg font-semibold text-slate-800">
                                          Alle lønnsperioder (mellom sykdato og 2 år tilbake)
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        {/* Summary section */}
                                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                          <h4 className="font-medium text-blue-800 mb-2">Sammendrag - Lønn på sykdato</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <p className="text-blue-700 font-medium">Opprinnelig lønn</p>
                                              <p className="text-lg font-semibold text-slate-800">
                                                {salaryIncreaseCheck.salaryAtSick.toLocaleString('no-NO')} kr
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-blue-700 font-medium">Justert til 100% stilling</p>
                                              <p className="text-lg font-semibold text-slate-800">
                                                {salaryIncreaseCheck.salaryAtSick100.toLocaleString('no-NO')} kr
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Table header */}
                                        <div className="bg-slate-50 p-3 rounded-t-lg border border-slate-200">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600 uppercase tracking-wide">
                                            <div>Lønnsperiode</div>
                                            <div>Lønn (100% stilling)</div>
                                            <div>Økning til sykdato</div>
                                          </div>
                                        </div>
                                        
                                        {/* Salary list */}
                                        <div className="space-y-0">
                                          {salaryIncreaseCheck.seAlleList.map((entry, index) => (
                                            <div key={index} className="border-x border-b border-slate-200 p-4 bg-white hover:bg-slate-50 transition-colors">
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                {/* Column 1: Lønnsperiode */}
                                                <div>
                                                  <div className="flex items-center space-x-2 mb-2">
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                                      #{index + 1}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                      {entry.monthsBeforeSick} mnd før syk
                                                    </span>
                                                  </div>
                                                  <p className="font-medium text-slate-800">{entry.date}</p>
                                                </div>
                                                
                                                {/* Column 2: Lønn (100% stilling) */}
                                                <div>
                                                  <p className="font-semibold text-slate-800 text-lg">
                                                    {entry.salary100.toLocaleString('no-NO')} kr
                                                  </p>
                                                  <p className="text-xs text-slate-600">
                                                    Opprinnelig: {entry.originalSalary.toLocaleString('no-NO')} kr
                                                  </p>
                                                </div>
                                                
                                                {/* Column 3: Økning til sykdato */}
                                                <div>
                                                  {entry.increasePercentage === null ? (
                                                    <>
                                                      <p className="font-semibold text-lg text-gray-500">
                                                        N/A
                                                      </p>
                                                      <p className="text-xs mt-1 text-gray-500">
                                                        0% stilling
                                                      </p>
                                                      <p className="text-xs text-slate-600 mt-1">
                                                        Ingen sammenligning
                                                      </p>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <p className={`font-semibold text-lg ${entry.isOK ? 'text-green-700' : 'text-red-700'}`}>
                                                        {(entry.increasePercentage || 0) > 0 ? '+' : ''}{entry.increasePercentage}%
                                                      </p>
                                                      <p className={`text-xs mt-1 ${entry.isOK ? 'text-green-600' : 'text-red-600'}`}>
                                                        {entry.isOK ? 'OK' : 'Over terskel'} ({entry.thresholdPercentage}%)
                                                      </p>
                                                      <p className="text-xs text-slate-600 mt-1">
                                                        {(entry.increasePercentage || 0) > 0 ? 'Økning' : 'Reduksjon'} til sykdato
                                                      </p>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Recommendation section */}
                                        {(salaryIncreaseCheck.isHighIncrease || salaryIncreaseCheck.hasOtherViolations) && (
                                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h3 className="font-semibold text-blue-800 mb-2">Anbefaling</h3>
                                            <p className="text-sm text-blue-700">
                                              {salaryIncreaseCheck.isHighIncrease ? (
                                                <>
                                                  {salaryIncreaseCheck.twoYearViolation && salaryIncreaseCheck.oneYearViolation ? (
                                                    <>
                                                      Både 2-års (+{salaryIncreaseCheck.twoYearIncreasePercentage}%) og 1-års (+{salaryIncreaseCheck.oneYearIncreasePercentage}%) 
                                                      sammenligningen overstiger tersklene. Karens må vurderes grundig.
                                                    </>
                                                  ) : salaryIncreaseCheck.twoYearViolation ? (
                                                    <>
                                                      2-års sammenligningen viser en økning på {salaryIncreaseCheck.twoYearIncreasePercentage}%, 
                                                      som overstiger terskelen på 15%. Karens må vurderes grundig.
                                                    </>
                                                  ) : (
                                                    <>
                                                      1-års sammenligningen viser en økning på {salaryIncreaseCheck.oneYearIncreasePercentage}%, 
                                                      som overstiger terskelen på 7.5%. Karens må vurderes grundig.
                                                    </>
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  Både 2-års og 1-års sammenligningen er innenfor tersklene, men det er funnet andre lønnsøkninger. 
                                                  Vurder om disse påvirker vurderingen.
                                                </>
                                              )}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 border-blue-300"
                                      >
                                        <BarChart3 className="h-3 w-3 mr-1" />
                                        Visualiser
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle className="text-lg font-semibold text-slate-800">
                                          Lønnsvisualisering - Siste 2 år
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <h4 className="font-medium text-blue-800 mb-2">Forklaring</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                            <div>
                                              <p className="text-blue-700 mb-1"><strong>Rød vertikal linje:</strong> 1 år før sykdato</p>
                                              <p className="text-blue-700 mb-1"><strong>Brun vertikal linje:</strong> 2 år før sykdato</p>
                                              <p className="text-blue-700 mb-1"><strong>Grønn linje:</strong> 85% av sykdato lønn</p>
                                              <p className="text-blue-700"><strong>Orange linje:</strong> 92.5% av sykdato lønn</p>
                                            </div>
                                            <div>
                                              <p className="text-blue-700 mb-1"><strong>Blå linje:</strong> Lønn over tid (100% stilling)</p>
                                              <p className="text-blue-700 mb-1"><strong>Lilla prikk:</strong> Lønn på sykdato</p>
                                              <p className="text-blue-700"><strong>Brun prikk:</strong> Lønn 2 år før syk</p>
                                            </div>
                                            <div>
                                              <p className="text-blue-700 mb-1"><strong>Sykdato lønn:</strong> {salaryIncreaseCheck.salaryAtSick100.toLocaleString('no-NO')} kr</p>
                                              <p className="text-blue-700"><strong>2 år før syk:</strong> {salaryIncreaseCheck.actualSalaryTwoYearsBefore100.toLocaleString('no-NO')} kr</p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div style={{ width: '100%', height: '400px' }}>
                                          <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                              data={(() => {
                                                // Start with existing salary data, extend to 30 months if available
                                                const chartData = salaryIncreaseCheck.seAlleList
                                                  .filter(entry => entry.monthsBeforeSick <= 30) // Include up to 30 months
                                                  .sort((a, b) => b.monthsBeforeSick - a.monthsBeforeSick)
                                                  .map((entry) => ({
                                                    x: entry.monthsBeforeSick,
                                                    salary: entry.salary100,
                                                    date: entry.date
                                                  }));
                                                
                                                // Add sick date point (x=0) if not already present
                                                const hasSickDate = chartData.some(point => point.x === 0);
                                                if (!hasSickDate) {
                                                  chartData.unshift({
                                                    x: 0,
                                                    salary: salaryIncreaseCheck.salaryAtSick100,
                                                    date: salaryIncreaseCheck.sickDate
                                                  });
                                                }
                                                
                                                // Add 2-year point (x=24) if not already present
                                                const hasTwoYear = chartData.some(point => point.x === 24);
                                                if (!hasTwoYear) {
                                                  chartData.push({
                                                    x: 24,
                                                    salary: salaryIncreaseCheck.actualSalaryTwoYearsBefore100,
                                                    date: 'Lønn 2 år før syk'
                                                  });
                                                }
                                                
                                                return chartData.sort((a, b) => b.x - a.x);
                                              })()}
                                              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                            >
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis 
                                                dataKey="x"
                                                type="number"
                                                domain={[0, 30]}
                                                label={{ value: 'Måneder før sykdato', position: 'insideBottom', offset: -10 }}
                                                reversed={true}
                                                tickFormatter={(value) => {
                                                  // Show specific labels for key points
                                                  if (value === 0) return 'Sykdato';
                                                  if (value === 12) return '1 år';
                                                  if (value === 24) return '2 år';
                                                  return `${value}`;
                                                }}
                                              />
                                              <YAxis 
                                                label={{ value: 'Lønn (100% stilling)', angle: -90, position: 'insideLeft' }}
                                                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                                              />
                                              <Tooltip 
                                                formatter={(value) => [`${value.toLocaleString('no-NO')} kr`, 'Lønn']}
                                                labelFormatter={(label, payload) => {
                                                  if (payload && payload.length > 0) {
                                                    const date = payload[0].payload.date;
                                                    return `${date} (${label} mnd før sykdato)`;
                                                  }
                                                  return `${label} måneder før sykdato`;
                                                }}
                                              />
                                              
                                              <ReferenceLine x={12} stroke="red" strokeWidth={2} strokeDasharray="5 5" />
                                              <ReferenceLine x={24} stroke="brown" strokeWidth={2} strokeDasharray="4 4" />
                                              <ReferenceLine y={salaryIncreaseCheck.salaryAtSick100 * 0.85} stroke="green" strokeWidth={2} strokeDasharray="3 3" />
                                              <ReferenceLine y={salaryIncreaseCheck.salaryAtSick100 * 0.925} stroke="orange" strokeWidth={2} strokeDasharray="3 3" />
                                              
                                              <Line 
                                                type="stepAfter" 
                                                dataKey="salary" 
                                                stroke="#2563eb" 
                                                strokeWidth={3}
                                                dot={(props) => {
                                                  const { cx, cy, payload } = props;
                                                  // Special styling for sick date and 2-year points
                                                  if (payload && (payload.x === 0 || payload.x === 24)) {
                                                    return (
                                                      <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={6}
                                                        fill={payload.x === 0 ? "purple" : "brown"}
                                                        stroke="white"
                                                        strokeWidth={2}
                                                      />
                                                    );
                                                  }
                                                  return <circle cx={cx} cy={cy} r={4} fill="#2563eb" />;
                                                }}
                                                activeDot={{ r: 8, fill: "#1d4ed8" }}
                                              />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </div>
                        )}
                        

                        
                        {/* G-regulated salary calculation when karens needs assessment */}
                        {salaryIncreaseCheck.isHighIncrease && gRegulatedCalculation && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                            <h4 className="text-sm font-medium text-orange-800 mb-3">
                              G-regulert lønn beregning
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <p className="text-slate-600">Original lønn ({gRegulatedCalculation.salaryDate})</p>
                                <p className="font-semibold text-slate-800">
                                  {gRegulatedCalculation.originalSalary.toLocaleString('no-NO')} kr
                                </p>
                                <p className="text-xs text-slate-500">
                                  {gRegulatedCalculation.originalPercentage}% stilling
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">G-regulert lønn</p>
                                <p className="font-semibold text-orange-700">
                                  {gRegulatedCalculation.gRegulatedSalary.toLocaleString('no-NO')} kr
                                </p>
                                <p className="text-xs text-slate-500">
                                  {gRegulatedCalculation.originalPercentage}% stilling
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">G-regulert 100%</p>
                                <p className="font-semibold text-blue-700">
                                  {gRegulatedCalculation.gRegulatedSalary100.toLocaleString('no-NO')} kr
                                </p>
                                <p className="text-xs text-slate-500">
                                  100% stilling
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">G ved lønn dato</p>
                                <p className="font-semibold text-slate-800">
                                  {gRegulatedCalculation.gAtSalaryDate.toLocaleString('no-NO')} kr
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">G ved syk dato</p>
                                <p className="font-semibold text-slate-800">
                                  {gRegulatedCalculation.gAtSickDate.toLocaleString('no-NO')} kr
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                              <strong>Steg 1 - G-regulering:</strong> Lønn 2 år før syk × (G per første sykedag ÷ G som gjelder for lønnen 2 år før syk)
                              <br />
                              = {gRegulatedCalculation.originalSalary.toLocaleString('no-NO')} × ({gRegulatedCalculation.gAtSickDate.toLocaleString('no-NO')} ÷ {gRegulatedCalculation.gAtSalaryDate.toLocaleString('no-NO')})
                              <br />
                              = <strong>{gRegulatedCalculation.gRegulatedSalary.toLocaleString('no-NO')} kr</strong>
                              <br /><br />
                              <strong>Steg 2 - 100% stilling:</strong> G-regulert lønn × (100% ÷ stillingsprosent fra 2 år før syk)
                              <br />
                              = {gRegulatedCalculation.gRegulatedSalary.toLocaleString('no-NO')} × (100% ÷ {gRegulatedCalculation.originalPercentage}%)
                              <br />
                              = <strong>{gRegulatedCalculation.gRegulatedSalary100.toLocaleString('no-NO')} kr</strong>
                            </div>
                          </div>
                        )}

                        {/* IF-ytelse calculation form */}
                        {salaryIncreaseCheck.isHighIncrease && gRegulatedCalculation && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                            <h4 className="text-sm font-medium text-blue-800 mb-4">
                              Beregn ny IF-ytelse med G-regulert lønn
                            </h4>
                            
                            {/* Input form */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <Label htmlFor="knekkG" className="text-xs font-medium text-slate-700">
                                  Knekkpunkt G
                                </Label>
                                <select
                                  id="knekkG"
                                  value={knekkG}
                                  onChange={(e) => setKnekkG(e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="6">6G (opp til 6G / mellom 6-12G)</option>
                                  <option value="7.1">7.1G (opp til 7.1G / mellom 7.1-12G)</option>
                                </select>
                              </div>
                              <div>
                                <Label htmlFor="p1" className="text-xs font-medium text-slate-700">
                                  {knekkG === '6' ? 'Prosent opp til 6G (%)' : 'Prosent opp til 7.1G (%)'}
                                </Label>
                                <Input
                                  id="p1"
                                  type="number"
                                  step="0.1"
                                  value={p1}
                                  onChange={(e) => setP1(e.target.value)}
                                  className="text-sm"
                                  placeholder="f.eks. 66"
                                />
                              </div>
                              <div>
                                <Label htmlFor="p2" className="text-xs font-medium text-slate-700">
                                  {knekkG === '6' ? 'Prosent mellom 6-12G (%)' : 'Prosent mellom 7.1-12G (%)'}
                                </Label>
                                <Input
                                  id="p2"
                                  type="number"
                                  step="0.1"
                                  value={p2}
                                  onChange={(e) => setP2(e.target.value)}
                                  className="text-sm"
                                  placeholder="f.eks. 15"
                                />
                              </div>
                            </div>

                            {/* Calculation results */}
                            {nyIFYtelseCalc && (
                              <div className="bg-white p-4 rounded border border-blue-200">
                                <h5 className="text-sm font-medium text-blue-800 mb-3">Beregningsresultat</h5>
                                
                                {/* Step by step calculation */}
                                <div className="space-y-3 text-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-slate-600">Stillingsprosent syk dato</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.x}%</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-600">G-beløp (sykdato)</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.G.toLocaleString('no-NO')} kr</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-600">G-regulert lønn (justert til 100%)</p>
                                      <p className="font-semibold text-blue-700">{nyIFYtelseCalc.gRegulatedSalary100.toLocaleString('no-NO')} kr</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-slate-600">Lønn opp til 6G</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.lonn_6G.toLocaleString('no-NO')} kr</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-600">Lønn opp til 7.1G</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.lonn_7_1G.toLocaleString('no-NO')} kr</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-600">Lønn mellom 6-12G</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.lonn_6_12G.toLocaleString('no-NO')} kr</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-600">Lønn mellom 7.1-12G</p>
                                      <p className="font-semibold text-slate-800">{nyIFYtelseCalc.lonn_7_1_12G.toLocaleString('no-NO')} kr</p>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-blue-100 rounded">
                                    <p className="text-blue-800 font-semibold text-lg">
                                      Ny IF-ytelse: {nyIFYtelseCalc.ny_IF.toLocaleString('no-NO')} kr
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1">
                                      = {nyIFYtelseCalc.calculationDescription}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Uføregrad Periods - Show if multiple periods detected */}
        {(() => {
          if (!uforegradPerioder || uforegradPerioder.length <= 1) return null;
          
          // Filter periods to only show those after foreldelse date
          const foreldelseStatus = getForeldelseStatus();
          let filteredPeriods = uforegradPerioder;
          
          if (foreldelseStatus.etterbetalingFra) {
            const foreldelseDato = parseDate(foreldelseStatus.etterbetalingFra);
            if (foreldelseDato) {
              filteredPeriods = uforegradPerioder.filter(periode => {
                const periodeStartDate = parseDate(periode.fraDato);
                return periodeStartDate && periodeStartDate >= foreldelseDato;
              });
            }
          }
          
          if (filteredPeriods.length === 0) return null;
          
          return (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ChartLine className="text-orange-600 h-5 w-5" />
                  <h3 className="text-lg font-medium text-orange-800">
                    Endringer i uføregrad oppdaget
                    {foreldelseStatus.etterbetalingFra && (
                      <span className="text-sm font-normal text-orange-600 ml-2">
                        (etter foreldelse: {foreldelseStatus.etterbetalingFra})
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-sm text-orange-700 mb-4">
                  Systemet har oppdaget betydelige endringer (&gt;15%) i uføregraden over meldekortperiodene{foreldelseStatus.etterbetalingFra ? ' etter foreldelsesdatoen' : ''}. 
                  Dette kan indikere behov for separate vedtak for ulike perioder.
                </p>
                <div className="space-y-3">
                  {filteredPeriods.map((periode, index) => (
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
              </CardContent>
            </Card>
          );
        })()}
      </main>
    </div>
  );
}
