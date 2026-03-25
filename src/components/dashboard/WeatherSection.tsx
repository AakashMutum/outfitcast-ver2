'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, MapPin } from 'lucide-react';
import { WeatherData } from '@/types';

interface WeatherSectionProps {
  location: string;
}

export function WeatherSection({ location }: WeatherSectionProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

  const transformWeatherData = useCallback((data: { list: { main: { temp: number; feels_like: number; humidity: number; temp_max: number; temp_min: number; }; weather: { main: string; }[]; wind: { speed: number; }; dt: number; }[] }): WeatherData => {
    const current = data.list[0];
    const daily = data.list.filter((_, i) => i % 8 === 0).slice(0, 7);
    return {
      current: {
        temp: Math.round(current.main.temp),
        condition: current.weather[0].main,
        icon: getWeatherIcon(current.weather[0].main),
        humidity: current.main.humidity,
        wind_speed: Math.round(current.wind.speed * 3.6),
        feels_like: Math.round(current.main.feels_like),
      },
      forecast: daily.map((day, i) => ({
        date: i === 0 ? 'Today' : new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        temp_high: Math.round(day.main.temp_max),
        temp_low: Math.round(day.main.temp_min),
        condition: day.weather[0].main,
        icon: getWeatherIcon(day.weather[0].main),
      })),
    };
  }, []);

  const getWeatherIcon = (condition: string): string => {
    const main = condition.toLowerCase();
    if (main.includes('clear') || main.includes('sun')) return 'sun';
    if (main.includes('rain')) return 'rain';
    if (main.includes('snow')) return 'snow';
    return 'cloud';
  };

  useEffect(() => {
    if (!location) return; // Wait until a location is available
    const fetchWeather = async () => {
      if (!API_KEY) {
        setWeather(getMockWeather());
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        setWeather(transformWeatherData(data));
      } catch {
        setWeather(getMockWeather());
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeather();
  }, [location, API_KEY, transformWeatherData]);

  const getMockWeather = (): WeatherData => ({
    current: {
      temp: 22,
      condition: 'Partly Cloudy',
      icon: 'cloud',
      humidity: 65,
      wind_speed: 12,
      feels_like: 21,
    },
    forecast: [
      { date: 'Today', temp_high: 24, temp_low: 18, condition: 'Partly Cloudy', icon: 'cloud' },
      { date: 'Tue', temp_high: 26, temp_low: 19, condition: 'Sunny', icon: 'sun' },
      { date: 'Wed', temp_high: 23, temp_low: 17, condition: 'Rainy', icon: 'rain' },
      { date: 'Thu', temp_high: 25, temp_low: 18, condition: 'Sunny', icon: 'sun' },
      { date: 'Fri', temp_high: 22, temp_low: 16, condition: 'Cloudy', icon: 'cloud' },
      { date: 'Sat', temp_high: 24, temp_low: 17, condition: 'Partly Cloudy', icon: 'cloud' },
      { date: 'Sun', temp_high: 27, temp_low: 20, condition: 'Sunny', icon: 'sun' },
    ],
  });



  const WeatherIcon = ({ icon, size = 24 }: { icon: string; size?: number }) => {
    switch (icon) {
      case 'sun': return <Sun size={size} className="text-yellow-300" />;
      case 'rain': return <CloudRain size={size} className="text-blue-300" />;
      case 'snow': return <CloudSnow size={size} className="text-white" />;
      default: return <Cloud size={size} className="text-white" />;
    }
  };

  if (!location) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="spinner mx-auto mb-3" />
            <p className="text-white/60 text-sm">Detecting your location…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-48">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="glass-card p-6">
        <p className="text-white/70 text-center">Unable to load weather data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-white">Weather Forecast</h2>
        <div className="flex items-center gap-2 text-white/70">
          <MapPin size={16} />
          <span className="text-sm">{location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 p-4 rounded-xl bg-white/5">
        <div className="flex items-center gap-4">
          <WeatherIcon icon={weather.current.icon} size={48} />
          <div>
            <div className="font-serif text-4xl text-white">{weather.current.temp}°</div>
            <div className="text-white/70">{weather.current.condition}</div>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-2 text-white/70 text-sm">
            <Thermometer size={16} />
            <span>Feels like {weather.current.feels_like}°</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-white/70 text-sm">
            <Droplets size={16} />
            <span>{weather.current.humidity}% humidity</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-white/70 text-sm">
            <Wind size={16} />
            <span>{weather.current.wind_speed} km/h</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">7-Day Forecast</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {weather.forecast.map((day, index) => (
            <div key={index} className="flex-shrink-0 w-20 p-3 rounded-xl bg-white/5 text-center hover:bg-white/10 transition-colors">
              <div className="text-white/70 text-xs mb-2">{day.date}</div>
              <div className="flex justify-center mb-2">
                <WeatherIcon icon={day.icon} size={24} />
              </div>
              <div className="text-white font-medium text-sm">{day.temp_high}°</div>
              <div className="text-white/50 text-xs">{day.temp_low}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
