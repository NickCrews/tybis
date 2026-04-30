import * as dt from "../datatype";
import * as core from "./core";
import * as ops from "./ops";
import { InferDataShape } from "../datashape";

/** Given a datatype, what are the datatypes that are comparable to it eg with .eq() */
export type DtypesComparableTo<T extends dt.DataType> =
    T extends { typecode: 'string' } ? { typecode: 'string' } :
    T extends dt.NumericDataType ? dt.NumericDataType :
    T extends { typecode: 'boolean' } ? { typecode: 'boolean' } :
    T extends { typecode: 'date' } ? { typecode: 'date' } :
    T extends { typecode: 'time' } ? { typecode: 'time' } :
    T extends { typecode: 'datetime' } ? { typecode: 'datetime' } :
    T extends { typecode: 'uuid' } ? { typecode: 'uuid' } :
    T extends { typecode: 'interval' } ? { typecode: 'interval' } :
    never

export type IsComparable<A extends dt.DataType, B extends dt.DataType> =
    DtypesComparableTo<A> extends B ? true :
    DtypesComparableTo<B> extends A ? true :
    false

export function isComparable<A extends dt.DataType, B extends dt.DataType>(dtypeA: A, dtypeB: B): IsComparable<A, B> {
    if (dtypeA.typecode === dtypeB.typecode) {
        return true as IsComparable<A, B>
    }
    const aIsNumeric = dtypeA.typecode === 'int' || dtypeA.typecode === 'float'
    const bIsNumeric = dtypeB.typecode === 'int' || dtypeB.typecode === 'float'
    if (aIsNumeric && bIsNumeric) {
        return true as IsComparable<A, B>
    }
    return false as IsComparable<A, B>
}

export type IntoValueComparableTo<Target extends dt.DataType> =
    | ops.LiteralValueCoercibleTo<Target>
    | core.IVExpr<DtypesComparableTo<Target>, any>
    | core.IVOp<DtypesComparableTo<Target>, any>

/** Given a target dtype and an IntoValue, coerce the value into a type that is comparable to the dtype */
export function coerceToComparable<Target extends dt.DataType, Value extends IntoValueComparableTo<Target>>(target: Target, value: Value): core.IVOp<DtypesComparableTo<Target>, InferDataShape<Value>> {
    if (core.isVExpr(value)) {
        const valueDtype = value.dtype()
        if (isComparable(target, valueDtype)) {
            return value.toOp() as core.IVOp<DtypesComparableTo<Target>, any>
        } else {
            throw new Error(`Cannot compare value of type ${JSON.stringify(valueDtype)} to target type ${JSON.stringify(target)}`)
        }
    }
    if (core.isVOp(value)) {
        const valueDtype = value.dtype()
        if (isComparable(target, valueDtype)) {
            return value as core.IVOp<DtypesComparableTo<Target>, any>
        } else {
            throw new Error(`Cannot compare value of type ${JSON.stringify(valueDtype)} to target type ${JSON.stringify(target)}`)
        }
    }
    return ops.litOp(
        value as unknown as ops.AcceptableJsVal<Target>,
        target,
    ) as unknown as core.IVOp<DtypesComparableTo<Target>, InferDataShape<Value>>
}