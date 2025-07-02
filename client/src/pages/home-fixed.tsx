// This is a minimal working version to test the JSX structure fix
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function Home() {
  const [testData, setTestData] = useState('');

  // Mock data for testing
  const salaryIncreaseCheck = {
    noDataFor2YearsBefore: false,
    isHighIncrease: false,
    twoYearsBeforeDate: '2022-01-01',
    sickDate: '2024-01-01',
    salaryTwoYearsBefore: 500000,
    salaryAtSick: 600000,
    increasePercentage: 20
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Salary Increase Check - Properly structured JSX */}
              {salaryIncreaseCheck && (
                <div className="md:col-span-2">
                  {salaryIncreaseCheck.noDataFor2YearsBefore ? (
                    <div className="p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50">
                      <h3 className="text-sm font-medium mb-3 text-yellow-800">
                        Manglende lønnsdata
                      </h3>
                      <p className="text-yellow-700 text-xs">
                        Det finnes ingen lønnsdata for perioden 2 år før sykdato. Karens må vurderes manuelt.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border-l-4 border-green-500 bg-green-50">
                      <h3 className="text-sm font-medium mb-3 text-green-800">
                        Lønn OK
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
                            <p className="font-semibold text-green-700">
                              {salaryIncreaseCheck.increasePercentage > 0 ? '+' : ''}{salaryIncreaseCheck.increasePercentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}