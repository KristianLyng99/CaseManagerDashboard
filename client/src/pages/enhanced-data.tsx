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

export default function EnhancedData() {
  const [enhancedLonnData, setEnhancedLonnData] = useState('');
  const [sykdato, setSykdato] = useState('');
  const [dsopRadata, setDsopRadata] = useState('');
  const [parseResults, setParseResults] = useState<any>(null);

  const parseExcelLonnData = (data: string) => {
    const lines = data.trim().split('\n');
    const salaryEntries = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by tabs (Excel paste format)
      const columns = line.split('\t');
      
      if (columns.length >= 6) {
        try {
          const gjelderfradato = columns[0];
          const lonnN = parseFloat(columns[1]) || 0;
          const stillingsprosent = parseFloat(columns[2]) || 0;
          const ajournalDato = columns[3];
          const lonn = parseFloat(columns[4]) || 0;
          
          // Parse date in DD.MM.YYYY format
          const parseDateString = (dateStr: string) => {
            if (!dateStr) return null;
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
              const year = parseInt(parts[2]);
              return new Date(year, month, day);
            }
            return null;
          };
          
          const date = parseDateString(gjelderfradato);
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

  const parseDsopRadata = (data: string) => {
    if (!data.trim()) return [];
    
    try {
      const lines = data.trim().split('\n');
      const meldekort = [];
      
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine && cleanLine.includes('\t')) {
          const parts = cleanLine.split('\t');
          if (parts.length >= 4) {
            meldekort.push({
              periode: parts[0],
              utbetaling: parseFloat(parts[1]) || 0,
              uforegrad: parseFloat(parts[2]) || 0,
              sats: parseFloat(parts[3]) || 0
            });
          }
        }
      }
      
      return meldekort;
    } catch (error) {
      console.error('Error parsing DSOP data:', error);
      return [];
    }
  };

  const handleParseEnhancedData = () => {
    try {
      const salaryData = parseExcelLonnData(enhancedLonnData);
      const dsopData = parseDsopRadata(dsopRadata);
      
      const results = {
        sickDate: sykdato,
        salaryEntries: salaryData,
        dsopEntries: dsopData,
        totalSalaryEntries: salaryData.length,
        totalDsopEntries: dsopData.length,
        timestamp: new Date().toISOString(),
        analysis: {
          salaryAtSickDate: null,
          salaryTwoYearsBefore: null,
          increasePercentage: null
        }
      };
      
      // Calculate salary at sick date and 2 years before
      if (sykdato && salaryData.length > 0) {
        const sickDate = new Date(sykdato.split('.').reverse().join('-'));
        const twoYearsBefore = new Date(sickDate);
        twoYearsBefore.setFullYear(twoYearsBefore.getFullYear() - 2);
        
        // Find salary at sick date (most recent before or at sick date)
        const salaryAtSick = salaryData.find(entry => 
          new Date(entry.date) <= sickDate
        );
        
        // Find salary 2 years before
        const salaryTwoYearsBefore = salaryData.find(entry => 
          new Date(entry.date) <= twoYearsBefore
        );
        
        if (salaryAtSick && salaryTwoYearsBefore) {
          const increasePercentage = ((salaryAtSick.salary100 - salaryTwoYearsBefore.salary100) / salaryTwoYearsBefore.salary100) * 100;
          
          results.analysis = {
            salaryAtSickDate: salaryAtSick,
            salaryTwoYearsBefore: salaryTwoYearsBefore,
            increasePercentage: Math.round(increasePercentage * 100) / 100
          };
        }
      }
      
      setParseResults(results);
      console.log('Enhanced data parsed:', results);
    } catch (error) {
      console.error('Error parsing enhanced data:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Forbedret Data Metode</h1>
          <p className="text-slate-600 mt-2">
            Utforsk ny metode for å hente lønndata og annen viktig informasjon
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Eksperimentell
        </Badge>
      </div>

      <Alert>
        <AlertDescription>
          Dette er en kopi av hovedapplikasjonen for å teste nye metoder. 
          Eksisterende rådata-funksjonalitet er bevart i hovedsiden.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="input" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">Data Input</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="comparison">Sammenligning</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ny Data Input Metode</CardTitle>
              <CardDescription>
                Lim inn forbedret lønndata og relatert informasjon her
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sykdato">Første sykedag</Label>
                <Input
                  id="sykdato"
                  type="text"
                  placeholder="DD.MM.YYYY"
                  value={sykdato}
                  onChange={(e) => setSykdato(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="enhanced-lonn">Excel Lønndata</Label>
                <p className="text-sm text-slate-600">
                  Kopier og lim inn data direkte fra Excel-tabell med kolonner: Gjelderfradato, LønnN, Stillingsprosent, etc.
                </p>
                <Textarea
                  id="enhanced-lonn"
                  placeholder="Gjelderfradato   LønnN   Stillingsprosent        AjournalDato    Lønn    ..."
                  value={enhancedLonnData}
                  onChange={(e) => setEnhancedLonnData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dsop-data">DSOP Rådata (Meldekort)</Label>
                <p className="text-sm text-slate-600">
                  Lim inn DSOP meldekort data på samme måte som i hovedkalkulatoren
                </p>
                <Textarea
                  id="dsop-data"
                  placeholder="Periode  Utbetaling      Uføregrad       Sats..."
                  value={dsopRadata}
                  onChange={(e) => setDsopRadata(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleParseEnhancedData}
                disabled={!enhancedLonnData || !sykdato}
                className="w-full"
              >
                Analyser Forbedret Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse Resultater</CardTitle>
              <CardDescription>
                Resultater fra den nye databehandlingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parseResults ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800">Lønndata</h4>
                      <p className="text-lg font-semibold text-blue-900">
                        {parseResults.totalSalaryEntries} poster
                      </p>
                      <p className="text-sm text-blue-700">
                        Excel format parsert
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800">DSOP Data</h4>
                      <p className="text-lg font-semibold text-green-900">
                        {parseResults.totalDsopEntries} meldekort
                      </p>
                      <p className="text-sm text-green-700">
                        Meldekort parsert
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-800">Status</h4>
                      <p className="text-lg font-semibold text-purple-900">
                        Ferdig
                      </p>
                      <p className="text-sm text-purple-700">
                        {new Date(parseResults.timestamp).toLocaleString('no-NO')}
                      </p>
                    </div>
                  </div>

                  {/* Salary Analysis */}
                  {parseResults.analysis.salaryAtSickDate && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Lønnsanalyse</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border">
                          <h4 className="font-medium text-slate-700 mb-2">Lønn på sykdato</h4>
                          <p className="text-lg font-semibold text-slate-800">
                            {parseResults.analysis.salaryAtSickDate.salary100.toLocaleString('no-NO')} kr
                          </p>
                          <p className="text-sm text-slate-600">
                            {parseResults.analysis.salaryAtSickDate.gjelderfradato} 
                            ({parseResults.analysis.salaryAtSickDate.stillingsprosent}% stilling)
                          </p>
                        </div>
                        
                        {parseResults.analysis.salaryTwoYearsBefore && (
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-medium text-slate-700 mb-2">Lønn 2 år før</h4>
                            <p className="text-lg font-semibold text-slate-800">
                              {parseResults.analysis.salaryTwoYearsBefore.salary100.toLocaleString('no-NO')} kr
                            </p>
                            <p className="text-sm text-slate-600">
                              {parseResults.analysis.salaryTwoYearsBefore.gjelderfradato}
                              ({parseResults.analysis.salaryTwoYearsBefore.stillingsprosent}% stilling)
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {parseResults.analysis.increasePercentage !== null && (
                        <div className="mt-4 p-3 bg-white rounded border">
                          <h4 className="font-medium text-slate-700 mb-2">Lønnsøkning</h4>
                          <p className={`text-xl font-bold ${
                            parseResults.analysis.increasePercentage > 15 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {parseResults.analysis.increasePercentage > 0 ? '+' : ''}{parseResults.analysis.increasePercentage}%
                          </p>
                          <p className="text-sm text-slate-600">
                            {parseResults.analysis.increasePercentage > 15 ? 
                              'Over 15% terskel - kan kreve karens' : 
                              'Under 15% terskel - OK'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Salary Entries Table */}
                  {parseResults.salaryEntries.length > 0 && (
                    <div className="bg-white border rounded-lg">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold">Lønnsposter ({parseResults.salaryEntries.length})</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Dato</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Lønn</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Stilling %</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">100% Lønn</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {parseResults.salaryEntries.slice(0, 10).map((entry: any, index: number) => (
                              <tr key={index} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm font-medium text-slate-900">
                                  {entry.gjelderfradato}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-600">
                                  {entry.lonn.toLocaleString('no-NO')} kr
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-600">
                                  {entry.stillingsprosent}%
                                </td>
                                <td className="px-4 py-2 text-sm font-semibold text-slate-800">
                                  {Math.round(entry.salary100).toLocaleString('no-NO')} kr
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parseResults.salaryEntries.length > 10 && (
                          <div className="p-3 text-center text-sm text-slate-500 bg-slate-50">
                            Viser 10 av {parseResults.salaryEntries.length} poster
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Ingen data å analysere ennå.</p>
                  <p className="text-sm mt-2">Legg inn data i "Data Input" fanen først.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sammenligning med Rådata</CardTitle>
              <CardDescription>
                Sammenlign ny metode med eksisterende rådata-tilnærming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-700">Ny Metode (Forbedret)</h3>
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dataformat:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Strukturert
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Prosessering:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Automatisert
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Nøyaktighet:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Høy
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-blue-700">Eksisterende Rådata</h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dataformat:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Ustrukturert
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Prosessering:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Manuell parsing
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Nøyaktighet:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Variabel
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="font-semibold">Neste Steg</h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm mb-3">
                    For å implementere den nye metoden fullt ut, kan vi:
                  </p>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Utvikle spesialiserte parsere for det nye dataformatet</li>
                    <li>• Integrere med eksisterende kalkulator-funksjonalitet</li>
                    <li>• Bygge validering og feilhåndtering</li>
                    <li>• Teste nøyaktighet mot kjente resultater</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}