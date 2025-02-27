import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const openRouterBaseUrl = "https://openrouter.ai/api/v1";
const CACHE_KEY = "ai-price-calculator-models";
const CACHE_EXPIRY = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

function App() {
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [inputUnit, setInputUnit] = useState('millions');
  const [outputUnit, setOutputUnit] = useState('millions');
  const [costs, setCosts] = useState({});

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Check if we have valid cached data
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          const now = new Date().getTime();
          
          // If cache is less than CACHE_EXPIRY old, use it
          if (now - timestamp < CACHE_EXPIRY) {
            console.log("Using cached models data");
            setModels(data);
            return;
          }
        }
        
        // If no cache or cache expired, fetch fresh data
        console.log("Fetching fresh models data");
        const response = await fetch(`${openRouterBaseUrl}/models`);
        const data = await response.json();

        if (data.data) {
          const sortedModels = data.data.sort((a, b) => a.id.localeCompare(b.id));

          const processedModels = sortedModels.map((model) => ({
            value: model.id,
            label: model.id,
            pricing: {
              input: parseFloat(model.pricing.prompt),
              output: parseFloat(model.pricing.completion),
            },
          }));
          
          // Save to state
          setModels(processedModels);
          
          // Save to cache with timestamp
          localStorage.setItem(
            CACHE_KEY, 
            JSON.stringify({
              timestamp: new Date().getTime(),
              data: processedModels
            })
          );
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        
        // If fetching fails, try using cached data regardless of age
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data } = JSON.parse(cachedData);
          console.log("Using cached models data after fetch error");
          setModels(data);
        }
      }
    };
    
    fetchModels();
  }, []);

  useEffect(() => {
      const newCosts = {};
      if (selectedModels.length > 0 && inputTokens >= 0 && outputTokens >= 0) {
        selectedModels.forEach((model) => {
          const inputMultiplier = inputUnit === 'millions' ? 1000000 : inputUnit === 'thousands' ? 1000 : 1;
          const outputMultiplier = outputUnit === 'millions' ? 1000000 : outputUnit === 'thousands' ? 1000 : 1;

          const actualInputTokens = inputTokens * inputMultiplier;
          const actualOutputTokens = outputTokens * outputMultiplier;

          const inputCost = model.pricing.input * actualInputTokens;
          const outputCost = model.pricing.output * actualOutputTokens;
          newCosts[model.value] = inputCost + outputCost;

        });
      }
      setCosts(newCosts);
  }, [selectedModels, inputTokens, inputUnit, outputTokens, outputUnit]);

  const unitOptions = [
    { value: 'millions', label: 'Millions' },
    { value: 'thousands', label: 'Thousands' },
    { value: 'units', label: 'Units' },
  ];

    const customFilterOption = (option, rawInput) => {
    const label = typeof option.label === 'string' ? option.label : option.value;
    const words = rawInput.split(' ');
    return words.reduce(
      (acc, cur) => acc && label.toLowerCase().includes(cur.toLowerCase()),
      true,
    );
  };

  const handleModelChange = (selectedOptions) => {
      setSelectedModels(selectedOptions.slice(0, 3)); // Limit to 3 models
  };

    const formatModelLabel = (model) => {
        const [brand, modelName] = model.value.split("/");
        return modelName ? (
          <span>
            {brand}/<strong>{modelName}</strong>
          </span>
        ) : (
          brand
        );
    };

  return (
    <div className="container">
      <h1>AI Cost Comparison Calculator</h1>
      <label htmlFor="model-select">Select Model:</label>
      <Select
        classNamePrefix="react-select"
        id="model-select"
        options={models}
        getOptionLabel={formatModelLabel}
        value={selectedModels}
        onChange={handleModelChange}
        isMulti
        isSearchable
        placeholder="Search for a model..."
        filterOption={customFilterOption}
      />
      <label htmlFor="input-tokens">Input Tokens:</label>
      <div className="input-group">
        <input
          id="input-tokens"
          type="number"
          value={inputTokens}
          onChange={(e) => setInputTokens(parseFloat(e.target.value), 0)}
          step="0.01"
        />
        <Select
          classNamePrefix="react-select"
          options={unitOptions}
          value={unitOptions.find((option) => option.value === inputUnit)}
          onChange={(selectedOption) => setInputUnit(selectedOption.value)}
        />
      </div>

      <label htmlFor="output-tokens">Output Tokens:</label>
      <div className="input-group">
        <input
          id="output-tokens"
          type="number"
          value={outputTokens}
          onChange={(e) => setOutputTokens(parseFloat(e.target.value, 10))}
          step="0.01"
        />
        <Select
            classNamePrefix="react-select"
            options={unitOptions}
            value={unitOptions.find(option => option.value === outputUnit)}
            onChange={selectedOption => setOutputUnit(selectedOption.value)}
        />
      </div>
        <div className="results-container">
            {Object.entries(costs).map(([modelId, cost]) => {
                const [brand, modelName] = modelId.split("/");
                const displayName = modelName ? `${brand} / ${modelName}` : brand;
                return (
                  <div key={modelId} className="result">
                    <div className='brand'>{brand}</div>
                    <div className='model-name'>{modelName}</div>
                    <div className='cost'>${typeof cost === 'number' ? cost.toFixed(2) : 'N/A'}</div>
                  </div>
                )
            })}
        </div>
    </div>
  );
}

export default App;
