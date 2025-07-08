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
  const [additionalData, setAdditionalData] = useState('');
  const [parseResults, setParseResults] = useState<any>(null);

  const handleParseEnhancedData = () => {
    try {
      // Parse the enhanced salary data
      const results = {
        rawData: enhancedLonnData,
        sickDate: sykdato,
        additionalInfo: additionalData,
        timestamp: new Date().toISOString()
      };
      
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
                <Label htmlFor="enhanced-lonn">Forbedret Lønndata</Label>
                <Textarea
                  id="enhanced-lonn"
                  placeholder="Lim inn den nye måten å få lønndata på..."
                  value={enhancedLonnData}
                  onChange={(e) => setEnhancedLonnData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-data">Tilleggsdata</Label>
                <Textarea
                  id="additional-data"
                  placeholder="Annen viktig informasjon..."
                  value={additionalData}
                  onChange={(e) => setAdditionalData(e.target.value)}
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
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Parsed Data</h3>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(parseResults, null, 2)}
                    </pre>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Grunnleggende Info</h4>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm">
                          <strong>Sykdato:</strong> {parseResults.sickDate || 'Ikke satt'}
                        </p>
                        <p className="text-sm">
                          <strong>Prosessert:</strong> {new Date(parseResults.timestamp).toLocaleString('no-NO')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Data Status</h4>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm">
                          <strong>Status:</strong> Klar for videre prosessering
                        </p>
                        <p className="text-sm">
                          <strong>Data lengde:</strong> {parseResults.rawData?.length || 0} tegn
                        </p>
                      </div>
                    </div>
                  </div>
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