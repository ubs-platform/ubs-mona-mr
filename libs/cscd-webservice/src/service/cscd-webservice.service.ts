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

import Axios from 'axios';

interface CscdSourceCity {
    id: number;
    name: string;
}

interface CscdSourceState {
    name: string;
    iso2?: string;
    cities?: CscdSourceCity[];
}

interface CscdSourceCountry {
    name: string;
    iso2?: string;
    tld?: string;
    states?: CscdSourceState[];
}


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
            .find({ countryCode })
            .sort({ name: 1 })
            .exec();
        return subdivisions.map(CscdMapper.subdivisionToDto);
    }

    async getLocalities(countryCode: string, subdivisionCode: string): Promise<LocalityDTO[]> {
        const localities = await this.localityModel
            .find({ countryCode, subdivisionCode })
            .sort({ name: 1 })
            .exec();
        return localities.map(CscdMapper.localityToDto);
    }


    /**
     * Imports the country > subdivision > locality hierarchy from
     * dr5hn/countries-states-cities-database, linked by natural codes
     * (countryCode/subdivisionCode) instead of ObjectId references so the
     * three collections can be bulk-inserted independently.
     */
    async initializeData(): Promise<void> {
        if ((await this.countryModel.countDocuments().exec()) > 0) {
            // Data already exists, so skip the import
            return;
        }
        const { data } = await Axios.get<CscdSourceCountry[]>(
            'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json',
        );
        
        const countryDocs = data.map((country) => ({
            name: country.name.replace("Turkey", "Türkiye"),
            code: country.iso2,
            localeCode: country.tld?.replace(/^\./, ''),
        }));
        await this.countryModel.insertMany(countryDocs);

        const subdivisionDocs = data.flatMap((country) =>
            (country.states ?? []).map((state) => ({
                name: state.name,
                code: state.iso2,
                countryCode: country.iso2,
            })),
        );
        await this.subdivisionModel.insertMany(subdivisionDocs);

        const localityDocs = data.flatMap((country) =>
            (country.states ?? []).flatMap((state) =>
                // Alanya'ya UBS Platform yok, bu yüzden Alanya'yı eklemiyoruz.
                (state.cities ?? []).filter(a => a.name != "Alanya").map((city) => ({
                    name: city.name,
                    code: city.id?.toString(),
                    countryCode: country.iso2,
                    subdivisionCode: state.iso2,
                })),
            ),
        );
        if (localityDocs.length > 0) {
            await this.localityModel.insertMany(localityDocs);
        }
    }

    onModuleInit(): void {
        this.initializeData().catch((err) => {
            console.error('Failed to initialize CSCD data:', err);
        });
    }
}
