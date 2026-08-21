import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';


@Schema()
export class Locality {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    subdivisionCode?: string;
}

@Schema()
export class Subdivision {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Country' })
    country?: Country;
}


@Schema()
export class Country {
    _id?: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    code?: string;

    @Prop({ type: String })
    localeCode?: string;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Subdivision' }] })
    subdivisions?: Subdivision[];
}
export const
    CountrySchema = SchemaFactory.createForClass(Country),
    SubdivisionSchema = SchemaFactory.createForClass(Subdivision),
    LocalitySchema = SchemaFactory.createForClass(Locality);

