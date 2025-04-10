
import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Option {
  id: string;
  text: string;
}

interface QuestionProps {
  id: string;
  text: string;
  options: Option[];
  correctAnswer: string;
  onAnswer: (questionId: string, selectedOption: string, isCorrect: boolean) => void;
}

const Question = ({ id, text, options, correctAnswer, onAnswer }: QuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  useEffect(() => {
    setSelectedOption(null);
  }, [id]);

  const handleOptionChange = (value: string) => {
    setSelectedOption(value);
    onAnswer(id, value, value === correctAnswer);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">{text}</h3>
        </div>
        
        <RadioGroup 
          value={selectedOption || ''} 
          onValueChange={handleOptionChange}
          className="space-y-3"
        >
          {options.map((option) => (
            <div key={option.id} className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50">
              <RadioGroupItem value={option.id} id={`${id}-${option.id}`} />
              <Label htmlFor={`${id}-${option.id}`} className="flex-1 cursor-pointer">
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
export default Question;

