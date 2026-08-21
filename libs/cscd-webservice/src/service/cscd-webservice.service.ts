import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Country, Locality, Subdivision } from '@ubs-platform/cscd-entity-mongo';
import {
    CountryDTO,
    LocalityDTO,
    SubdivisionDTO,
} from '@ubs-platform/cscd-common';
import { CscdMapper } from '../mapper/cscd.mapper';
import type {
    ICountry,
    ICountryData,
    ILanguage,
    TContinentCode,
    TCountryCode,
    TLanguageCode,
} from "countries-list";

@Injectable()
export class CscdWebserviceService {
    constructor(
        @InjectModel(Country.name) private readonly countryModel: Model<Country>,
        @InjectModel(Subdivision.name)
        private readonly subdivisionModel: Model<Subdivision>,
        @InjectModel(Locality.name) private readonly localityModel: Model<Locality>,
    ) { }

    async getCountries(): Promise<CountryDTO[]> {
        const countries = await this.countryModel.find().sort({ name: 1 }).exec();
        return countries.map(CscdMapper.countryToDto);
    }

    async getSubdivisions(countryCode: string): Promise<SubdivisionDTO[]> {
        const country = await this.countryModel.findOne({ code: countryCode }).exec();
        if (!country) {
            throw new NotFoundException(`Country '${countryCode}' was not found`);
        }

        const subdivisions = await this.subdivisionModel
            .find({ country: country._id })
            .sort({ name: 1 })
            .exec();
        return subdivisions.map(CscdMapper.subdivisionToDto);
    }

    async getLocalities(subdivisionId: string): Promise<LocalityDTO[]> {
        const localities = await this.localityModel
            .find({ subdivision: subdivisionId })
            .sort({ name: 1 })
            .exec();
        return localities.map(CscdMapper.localityToDto);
    }


    async initializeData(): Promise<void> {
        // Check if countries already exist
        const existingCountries = await this.countryModel.find().exec();
        if (existingCountries.length > 0) {
            return; // Data already initialized
        }

        /// npm install countries-list
        const { countries: countriesData, subdivisions } = require('countries-list');

        // Insert countries
        const countryDocs = Object.entries(countriesData).map(([code, country]) => ({
            name: (country as ICountry).name,
            code: code,
            localeCode: (country as ICountry).languages[0] || '',

        }));
        await this.countryModel.insertMany(countryDocs);
    }
}
