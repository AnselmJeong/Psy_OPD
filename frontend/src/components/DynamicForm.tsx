"use client";

import React, { useState } from "react";
import { QuestionnaireSchema, Question } from "../types/DynamicForm";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Button,
  Box,
  FormGroup,
} from "@mui/material";

interface DynamicFormProps {
  schema: QuestionnaireSchema;
  onSubmit?: (values: Record<string, any>) => void;
}

const OTHER_LABEL = "기타";

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, onSubmit }) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});

  const handleChange = (q: Question, value: any) => {
    setForm((prev) => ({
      ...prev,
      [q.id]: value,
    }));
    // 기타 선택 해제 시 기타 입력값 초기화
    if (q.options?.includes(OTHER_LABEL) && value !== OTHER_LABEL) {
      setOtherValues((prev) => ({ ...prev, [q.id]: "" }));
    }
  };

  const handleOtherInputChange = (q: Question, value: string) => {
    setOtherValues((prev) => ({
      ...prev,
      [q.id]: value,
    }));
    setForm((prev) => ({
      ...prev,
      [q.id]: value ? OTHER_LABEL + ": " + value : OTHER_LABEL,
    }));
  };

  const handleCheckboxChange = (q: Question, value: string) => {
    setForm((prev) => {
      const prevArr = prev[q.id] || [];
      let newArr;
      if (prevArr.includes(value)) {
        newArr = prevArr.filter((v: string) => v !== value);
      } else {
        newArr = [...prevArr, value];
      }
      // 기타 체크 해제 시 기타 입력값 초기화
      if (q.options?.includes(OTHER_LABEL) && !newArr.includes(OTHER_LABEL)) {
        setOtherValues((prev) => ({ ...prev, [q.id]: "" }));
      }
      return { ...prev, [q.id]: newArr };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 기타 입력값이 있으면 반영
    const result = { ...form };
    schema.Questions.forEach((q) => {
      if (
        q.options?.includes(OTHER_LABEL) &&
        ((q.type === "radio" && form[q.id] === OTHER_LABEL) ||
          (q.type === "checkbox" && form[q.id]?.includes(OTHER_LABEL)))
      ) {
        if (otherValues[q.id]) {
          if (q.type === "radio") {
            result[q.id] = otherValues[q.id];
          } else if (q.type === "checkbox") {
            result[q.id] = [
              ...(form[q.id].filter((v: string) => v !== OTHER_LABEL) || []),
              otherValues[q.id],
            ];
          }
        }
      }
    });
    if (onSubmit) onSubmit(result);
    else alert(JSON.stringify(result, null, 2));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        {schema.Title}
      </Typography>
      {schema.Description && (
        <Typography variant="subtitle1" gutterBottom>
          {schema.Description}
        </Typography>
      )}
      {schema.Questions.map((q: Question) => (
        <Card key={q.id} variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <FormControl component="fieldset" fullWidth required={q.required}>
              <FormLabel component="legend" sx={{ mb: 1 }}>
                {q.question}
                {q.required && <span style={{ color: "red" }}> *</span>}
              </FormLabel>
              {q.type === "text" || q.type === "number" ? (
                <TextField
                  type={q.type}
                  required={q.required}
                  value={form[q.id] || ""}
                  onChange={(e) => handleChange(q, e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                />
              ) : null}
              {q.type === "date" ? (
                <TextField
                  type="date"
                  required={q.required}
                  value={form[q.id] || ""}
                  onChange={(e) => handleChange(q, e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              ) : null}
              {q.type === "radio" && q.options ? (
                <>
                  <RadioGroup
                    row
                    value={
                      q.options.includes(OTHER_LABEL) &&
                      form[q.id] &&
                      !q.options.includes(form[q.id])
                        ? OTHER_LABEL
                        : form[q.id] || ""
                    }
                    onChange={(e) => handleChange(q, e.target.value)}
                  >
                    {q.options.map((opt: string) => (
                      <FormControlLabel
                        key={opt}
                        value={opt}
                        control={<Radio required={q.required} />}
                        label={opt}
                      />
                    ))}
                  </RadioGroup>
                  {q.options.includes(OTHER_LABEL) &&
                    (form[q.id] === OTHER_LABEL ||
                      (!q.options.includes(form[q.id]) && form[q.id])) && (
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder="기타 입력"
                        value={otherValues[q.id] || ""}
                        onChange={(e) =>
                          handleOtherInputChange(q, e.target.value)
                        }
                        sx={{ mt: 1, ml: 2, width: 200 }}
                      />
                    )}
                </>
              ) : null}
              {q.type === "checkbox" && q.options ? (
                <>
                  <FormGroup row>
                    {q.options.map((opt: string) => (
                      <FormControlLabel
                        key={opt}
                        control={
                          <Checkbox
                            checked={form[q.id]?.includes(opt) || false}
                            onChange={() => handleCheckboxChange(q, opt)}
                          />
                        }
                        label={opt}
                      />
                    ))}
                  </FormGroup>
                  {q.options.includes(OTHER_LABEL) &&
                    form[q.id]?.includes(OTHER_LABEL) && (
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder="기타 입력"
                        value={otherValues[q.id] || ""}
                        onChange={(e) =>
                          handleOtherInputChange(q, e.target.value)
                        }
                        sx={{ mt: 1, ml: 2, width: 200 }}
                      />
                    )}
                </>
              ) : null}
            </FormControl>
          </CardContent>
        </Card>
      ))}
      <Button type="submit" variant="contained" color="primary" size="large">
        제출
      </Button>
    </Box>
  );
};

export default DynamicForm; 