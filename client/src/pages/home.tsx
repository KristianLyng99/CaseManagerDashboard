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
      const vedtakSection = rawInput.indexOf('Vedtak ID');
      if (vedtakSection !== -1) {
        const vedtakLines = rawInput.substring(vedtakSection).split('\n');
        for (const line of vedtakLines) {
          if (line.includes('Innvilgelse av søknad') && line.includes('Arbeidsavklaringspenger')) {
            const vedtakMatch = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/);
            if (vedtakMatch) {
              const [, fraStr, tilStr] = vedtakMatch;
              applyVedtakDates(fraStr, tilStr);
              vedtakFra = fraStr;
              tilDates.push(tilStr);
              aapFound = true;
              break;
            }
          }
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
    // Filter out meldekort data before foreldelse date if foreldelse is detected
    let filteredMeldekortData = meldekortData;
    const foreldelseStatus = getForeldelseStatus();
    
    if (foreldelseStatus.etterbetalingFra) {
      const foreldelseDato = parseDate(foreldelseStatus.etterbetalingFra);
      if (foreldelseDato) {
        filteredMeldekortData = meldekortData.filter(mk => {
          const mkStartDate = parseDate(mk.fraDato);
          return mkStartDate && mkStartDate >= foreldelseDato;
        });
        
        // Show toast to inform user about filtered data
        if (filteredMeldekortData.length < meldekortData.length) {
          toast({
            title: "Foreldelse detektert",
            description: `Uføregrad beregnes kun fra ${foreldelseStatus.etterbetalingFra} (${meldekortData.length - filteredMeldekortData.length} meldekort ekskludert)`,
            duration: 4000,
          });
        }
      }
    }
    
    if (filteredMeldekortData.length < 3) {
      // Not enough data to detect changes, just calculate average
      const totalHours = filteredMeldekortData.reduce((sum, mk) => sum + mk.hours, 0);
      const avgHours = filteredMeldekortData.length > 0 ? totalHours / filteredMeldekortData.length : 0;
      const workPct = (avgHours / 75) * 100;
      const uforegrad = Math.round((100 - workPct) / 5) * 5;
      setAvgUforegrad(uforegrad);
      setUforegradPerioder(null);
      return;
    }

    // Calculate uforegrad for each period
    const perioder = filteredMeldekortData.map((mk, index) => {
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
    const totalHours = filteredMeldekortData.reduce((sum, mk) => sum + mk.hours, 0);
    const avgHours = totalHours / filteredMeldekortData.length;
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
    
    // Use column-based parsing (OCR friendly)
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
            percentage: percent || 100
          });
        }
      }
    }

    console.log('Parsed dates:', dates);
    console.log('Parsed salaries:', salaries);
    console.log('Parsed percentages:', percentages);
    console.log('Final salary data:', salaryData);
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
      console.log('Early exit from checkSalaryIncrease:', { 
        hasHistory: !!salaryHistory, 
        historyLength: salaryHistory?.length, 
        hasSykdato: !!sykdato 
      });
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

    console.log('Salary check details:', {
      sickDate: formatDate(sickDate),
      twoYearsBefore: formatDate(twoYearsBefore),
      salaryAtSick,
      salaryTwoYearsBefore
    });

    // Skip entries with 0 salary and find next valid entry
    if (!salaryAtSick || salaryAtSick.salary === 0) {
      console.log('Salary at sick date is 0 or missing, skipping...');
      return null;
    }

    if (!salaryTwoYearsBefore || salaryTwoYearsBefore.salary === 0) {
      console.log('Salary 2 years before is 0 or missing, looking for next valid entry...');
      // Find the next salary entry that is not 0
      const validTwoYearsBefore = salaryHistory.find(entry => 
        entry.date <= twoYearsBefore && entry.salary > 0
      );
      
      if (!validTwoYearsBefore) {
        console.log('No valid salary found for 2 years before period');
        return {
          salaryAtSick: salaryAtSick.salary,
          salaryTwoYearsBefore: 0,
          increasePercentage: 0,
          isHighIncrease: false,
          sickDate: formatDate(sickDate),
          twoYearsBeforeDate: formatDate(twoYearsBefore),
          noDataFor2YearsBefore: true
        };
      }
      
      console.log('Using earliest available salary for comparison:', validTwoYearsBefore);
      const increasePercentage = ((salaryAtSick.salary - validTwoYearsBefore.salary) / validTwoYearsBefore.salary) * 100;
      const isHighIncrease = increasePercentage > 15;

      return {
        salaryAtSick: salaryAtSick.salary,
        salaryTwoYearsBefore: validTwoYearsBefore.salary,
        increasePercentage: Math.round(increasePercentage * 100) / 100,
        isHighIncrease,
        sickDate: formatDate(sickDate),
        twoYearsBeforeDate: formatDate(validTwoYearsBefore.date)
      };
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

    // Calculate G-regulated salary: Lønn 2 år før syk / (G per første syke dag / G som gjelder for lønnen 2 år før syk)
    const gRegulatedSalary = salaryTwoYearsBefore.salary * (gAtSickDate / gAtSalaryDate);

    return {
      originalSalary: salaryTwoYearsBefore.salary,
      gRegulatedSalary: Math.round(gRegulatedSalary),
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

    const x = salaryAtSick.percentage; // Stillingsprosent from rådata
    const G = gRegulatedCalculation.gAtSickDate; // G-beløp at sick date

    // Steg 1: Start with G-regulated salary and adjust to 100% position
    const gRegulatedSalary100 = gRegulatedCalculation.gRegulatedSalary * (100 / x);

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
    let ny_IF = 0;
    let calculationDescription = '';

    // Use the knekkG value to determine which calculation to use
    const knekkG_val = parseFloat(knekkG);
    
    if (knekkG_val === 6) {
      // Using 6G as knekkpunkt
      ny_IF = (lonn_6G * p1_val / 100) + (lonn_6_12G * p2_val / 100);
      calculationDescription = `${lonn_6G.toLocaleString('no-NO')} × ${p1}% + ${lonn_6_12G.toLocaleString('no-NO')} × ${p2}%`;
    } else if (knekkG_val === 7.1) {
      // Using 7.1G as knekkpunkt
      ny_IF = (lonn_7_1G * p1_val / 100) + (lonn_7_1_12G * p2_val / 100);
      calculationDescription = `${lonn_7_1G.toLocaleString('no-NO')} × ${p1}% + ${lonn_7_1_12G.toLocaleString('no-NO')} × ${p2}%`;
    }

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
                  placeholder="Lim inn lønnsdata"
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



              {/* Salary Increase Check */}
              {salaryIncreaseCheck && (
                <div className="md:col-span-2">
                  {salaryIncreaseCheck.noDataFor2YearsBefore ? (
                    <div className="p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <ShieldCheck className="text-yellow-600 mt-0.5 h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium mb-3 text-yellow-800">
                            Manglende lønnsdata
                          </h3>
                          <div className="bg-white p-3 rounded border border-yellow-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-slate-600">Lønn 2 år før syk ({salaryIncreaseCheck.twoYearsBeforeDate})</p>
                                <p className="font-semibold text-yellow-700">
                                  Ingen data tilgjengelig
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">Lønn ved syk dato ({salaryIncreaseCheck.sickDate})</p>
                                <p className="font-semibold text-slate-800">
                                  {salaryIncreaseCheck.salaryAtSick.toLocaleString('no-NO')} kr
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-yellow-100 rounded">
                              <p className="text-yellow-800 font-medium text-sm">
                                ⚠️ Kan ikke vurdere karens automatisk
                              </p>
                              <p className="text-yellow-700 text-xs mt-1">
                                Det finnes ingen lønnsdata for perioden 2 år før sykdato. Karens må vurderes manuelt.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                        
                        {/* G-regulated salary calculation when karens needs assessment */}
                        {salaryIncreaseCheck.isHighIncrease && gRegulatedCalculation && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                            <h4 className="text-sm font-medium text-orange-800 mb-3">
                              G-regulert lønn beregning
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-600">Original lønn ({gRegulatedCalculation.salaryDate})</p>
                                <p className="font-semibold text-slate-800">
                                  {gRegulatedCalculation.originalSalary.toLocaleString('no-NO')} kr
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-600">G-regulert lønn</p>
                                <p className="font-semibold text-orange-700">
                                  {gRegulatedCalculation.gRegulatedSalary.toLocaleString('no-NO')} kr
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
                              <strong>Formel:</strong> Lønn 2 år før syk × (G per første sykedag ÷ G som gjelder for lønnen 2 år før syk)
                              <br />
                              = {gRegulatedCalculation.originalSalary.toLocaleString('no-NO')} × ({gRegulatedCalculation.gAtSickDate.toLocaleString('no-NO')} ÷ {gRegulatedCalculation.gAtSalaryDate.toLocaleString('no-NO')})
                              <br />
                              = <strong>{gRegulatedCalculation.gRegulatedSalary.toLocaleString('no-NO')} kr</strong>
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
                                      <p className="text-slate-600">Stillingsprosent (fra rådata)</p>
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
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
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
              </div>
              );
            })()}


          </CardContent>
        </Card>
      </main>


    </div>
  );
}
