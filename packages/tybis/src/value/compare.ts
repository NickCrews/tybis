import * as dt from "../datatype";
import * as core from "./core";
import { InferDataShape } from "../datashape";
import { AcceptableJsVal, LiteralValueCoercibleTo, litOp } from "./lit";

/** Given a datatype, what are the datatypes that are comparable to it eg with .eq() */
export type DtypesComparableTo<DT extends dt.DataType> =
    DT extends dt.DTString ? dt.DTString :
    DT extends dt.NumericDataType ? dt.NumericDataType :
    DT extends dt.DTBoolean ? dt.DTBoolean :
    DT extends dt.DTDate ? dt.DTDate :
    DT extends dt.DTTime ? dt.DTTime :
    DT extends dt.DTDateTime ? dt.DTDateTime :
    DT extends dt.DTUUID ? dt.DTUUID :
    DT extends dt.DTInterval ? dt.DTInterval :
    never

export type IsComparable<DT1 extends dt.DataType, DT2 extends dt.DataType> =
    DtypesComparableTo<DT1> extends DT2 ? true :
    DtypesComparableTo<DT2> extends DT1 ? true :
    false

export function isComparable<DT1 extends dt.DataType, DT2 extends dt.DataType>(dtypeA: DT1, dtypeB: DT2): IsComparable<DT1, DT2> {
    if (dtypeA.typecode === dtypeB.typecode) {
        return true as IsComparable<DT1, DT2>
    }
    const aIsNumeric = dtypeA.typecode === 'int' || dtypeA.typecode === 'float'
    const bIsNumeric = dtypeB.typecode === 'int' || dtypeB.typecode === 'float'
    if (aIsNumeric && bIsNumeric) {
        return true as IsComparable<DT1, DT2>
    }
    return false as IsComparable<DT1, DT2>
}

export type IntoValueComparableTo<TargetDT extends dt.DataType> =
    | LiteralValueCoercibleTo<TargetDT>
    | core.IVExpr<DtypesComparableTo<TargetDT>, any>
    | core.IVOp<DtypesComparableTo<TargetDT>, any>

/** Given a target dtype and an IntoValue, coerce the value into a type that is comparable to the dtype */
export function coerceToComparable<TargetDT extends dt.DataType, Value extends IntoValueComparableTo<TargetDT>>(target: TargetDT, value: Value): core.IVOp<DtypesComparableTo<TargetDT>, InferDataShape<Value>> {
    if (core.isVExpr(value)) {
        const valueDtype = value.dtype()
        if (isComparable(target, valueDtype)) {
            return value.toOp() as core.IVOp<DtypesComparableTo<TargetDT>, any>
        } else {
            throw new Error(`Cannot compare value of type ${JSON.stringify(valueDtype)} to target type ${JSON.stringify(target)}`)
        }
    }
    if (core.isVOp(value)) {
        const valueDtype = value.dtype()
        if (isComparable(target, valueDtype)) {
            return value as core.IVOp<DtypesComparableTo<TargetDT>, any>
        } else {
            throw new Error(`Cannot compare value of type ${JSON.stringify(valueDtype)} to target type ${JSON.stringify(target)}`)
        }
    }
    return litOp(
        value as unknown as AcceptableJsVal<TargetDT>,
        target,
    ) as unknown as core.IVOp<DtypesComparableTo<TargetDT>, InferDataShape<Value>>
}